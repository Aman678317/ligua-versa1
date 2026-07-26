// Real Multi-Peer WebRTC Service for LinguaVersa
// Manages peer connections, STUN/TURN configuration, local/remote stream tracks, and signaling exchange

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
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
    // When existing peer sends offer to us
    this.socket.on('webrtc-offer', async ({ senderSocketId, offer }) => {
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

    // When peer replies with answer
    this.socket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
      const pc = this.peerConnections.get(senderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('[WebRTC] Error setting remote answer:', err);
        }
      }
    });

    // When peer sends ICE Candidate
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

    // When remote user leaves room
    this.socket.on('user-left', ({ socketId }) => {
      this.closePeerConnection(socketId);
    });
  }

  // Create new peer connection for a socket ID
  createPeerConnection(targetSocketId) {
    if (this.peerConnections.has(targetSocketId)) {
      return this.peerConnections.get(targetSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(targetSocketId, pc);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote track received
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamAdded(targetSocketId, event.streams[0]);
      }
    };

    // Monitor connection state
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        this.closePeerConnection(targetSocketId);
      }
    };

    return pc;
  }

  // Initiate offer to a newly joined peer
  async initiateOffer(targetSocketId) {
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
