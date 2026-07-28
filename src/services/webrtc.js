// Real Multi-Peer WebRTC & TURN Relay Service for LinguaVersa
// Supports cross-network connection (Wi-Fi + Mobile LTE) via STUN & TURN servers, ICE Restarts, & Telemetry

const getIceServers = () => {
  const customTurnUrl = import.meta.env?.VITE_TURN_URL;
  const customUsername = import.meta.env?.VITE_TURN_USERNAME;
  const customCredential = import.meta.env?.VITE_TURN_CREDENTIAL;

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  if (customTurnUrl) {
    iceServers.push({
      urls: customTurnUrl,
      username: customUsername || '',
      credential: customCredential || ''
    });
  } else {
    // OpenRELAY TURN Fallbacks for cross-network (LTE + Wi-Fi) traversal
    iceServers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    );
  }

  return { iceServers, iceCandidatePoolSize: 10 };
};

export class WebRTCManager {
  constructor(socket, localStream, onRemoteStreamAdded, onRemoteStreamRemoved) {
    this.socket = socket;
    this.localStream = localStream;
    this.onRemoteStreamAdded = onRemoteStreamAdded;
    this.onRemoteStreamRemoved = onRemoteStreamRemoved;
    this.peerConnections = new Map(); // socketId -> RTCPeerConnection
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('webrtc-offer', async ({ senderSocketId, offer }) => {
      console.log(`[WebRTC] Received offer from ${senderSocketId}`);
      const pc = this.createPeerConnection(senderSocketId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit('webrtc-answer', {
          targetSocketId: senderSocketId,
          answer
        });
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    });

    this.socket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
      console.log(`[WebRTC] Received answer from ${senderSocketId}`);
      const pc = this.peerConnections.get(senderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('[WebRTC] Error setting remote answer:', err);
        }
      }
    });

    this.socket.on('webrtc-ice-candidate', async ({ senderSocketId, candidate }) => {
      const pc = this.peerConnections.get(senderSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Error adding ICE candidate:', err);
        }
      }
    });

    // Handle both event names for peer departure
    const handlePeerGone = ({ socketId }) => {
      console.log(`[WebRTC] Peer ${socketId} left, closing connection.`);
      this.closePeerConnection(socketId);
    };

    this.socket.on('user-left', handlePeerGone);
    this.socket.on('peer-left', handlePeerGone);
  }


  createPeerConnection(targetSocketId) {
    if (this.peerConnections.has(targetSocketId)) {
      return this.peerConnections.get(targetSocketId);
    }

    const config = getIceServers();
    const pc = new RTCPeerConnection(config);
    this.peerConnections.set(targetSocketId, pc);

    // Attach local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // Remote Track received
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${targetSocketId}`);
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamAdded(targetSocketId, event.streams[0]);
      }
    };

    // Connection State Change & ICE Restart Handling
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC] ICE Connection State for ${targetSocketId}: ${state}`);

      if (state === 'failed' || state === 'disconnected') {
        console.warn(`[WebRTC] ICE state ${state} for ${targetSocketId}. Attempting ICE Restart...`);
        this.attemptIceRestart(targetSocketId);

        // Report telemetry error log to server
        this.socket.emit('webrtc-log-error', {
          targetSocketId,
          state,
          timestamp: new Date().toISOString()
        });
      }
    };

    return pc;
  }

  async initiateOffer(targetSocketId) {
    console.log(`[WebRTC] Initiating offer to ${targetSocketId}`);
    const pc = this.createPeerConnection(targetSocketId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc-offer', {
        targetSocketId,
        offer
      });
    } catch (err) {
      console.error('[WebRTC] Error creating offer:', err);
    }
  }

  async attemptIceRestart(targetSocketId) {
    const pc = this.peerConnections.get(targetSocketId);
    if (!pc) return;

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc-offer', {
        targetSocketId,
        offer
      });
      console.log(`[WebRTC] ICE Restart offer sent to ${targetSocketId}`);
    } catch (err) {
      console.error('[WebRTC] Error performing ICE restart:', err);
    }
  }

  closePeerConnection(targetSocketId) {
    const pc = this.peerConnections.get(targetSocketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(targetSocketId);
      this.onRemoteStreamRemoved(targetSocketId);
    }
  }

  updateLocalStream(newStream) {
    this.localStream = newStream;
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      senders.forEach(sender => pc.removeTrack(sender));
      if (newStream) {
        newStream.getTracks().forEach(track => pc.addTrack(track, newStream));
      }
    });
  }

  destroy() {
    this.peerConnections.forEach((pc, targetSocketId) => {
      pc.close();
      this.onRemoteStreamRemoved(targetSocketId);
    });
    this.peerConnections.clear();
  }
}
