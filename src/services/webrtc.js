// Real Multi-Peer WebRTC & TURN Relay Service for LinguaVersa
// Supports cross-network connection (Wi-Fi + Mobile LTE) via STUN & TURN servers

const getIceServers = () => {
  const customTurnUrl = import.meta.env?.VITE_TURN_URL;
  const customUsername = import.meta.env?.VITE_TURN_USERNAME;
  const customCredential = import.meta.env?.VITE_TURN_CREDENTIAL;

  const iceServers = [
    // Multiple Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Cloudflare STUN
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  if (customTurnUrl) {
    iceServers.push({
      urls: customTurnUrl,
      username: customUsername || '',
      credential: customCredential || ''
    });
  } else {
    // OpenRELAY public TURN servers – multiple ports for firewall traversal
    iceServers.push(
      { urls: 'turn:openrelay.metered.ca:80',           username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443',          username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turns:openrelay.metered.ca:443',         username: 'openrelayproject', credential: 'openrelayproject' },
      // Metered.ca TURN (alternative)
      { urls: 'turn:a.relay.metered.ca:80',             username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:a.relay.metered.ca:443',            username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turns:a.relay.metered.ca:443',           username: 'openrelayproject', credential: 'openrelayproject' }
    );
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
};

export class WebRTCManager {
  constructor(socket, localStream, onRemoteStreamAdded, onRemoteStreamRemoved) {
    this.socket = socket;
    this.localStream = localStream;           // MUST be a real MediaStream (not null)
    this.onRemoteStreamAdded = onRemoteStreamAdded;
    this.onRemoteStreamRemoved = onRemoteStreamRemoved;
    this.peerConnections = new Map();         // socketId → RTCPeerConnection
    this._boundHandlers = {};                 // keep refs for cleanup
    this.setupSocketListeners();
    console.log('[WebRTC] Manager created. Local stream tracks:', localStream?.getTracks().map(t => t.kind));
  }

  setupSocketListeners() {
    // ── Incoming offer from a remote peer ──────────────────────────────────
    const onOffer = async ({ senderSocketId, offer }) => {
      console.log(`[WebRTC] ← offer from ${senderSocketId}`);
      const pc = this.createPeerConnection(senderSocketId);

      try {
        // Handle re-negotiation: reset if already stable
        if (pc.signalingState !== 'stable') {
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(new RTCSessionDescription(offer))
          ]);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket.emit('webrtc-answer', { targetSocketId: senderSocketId, answer });
        console.log(`[WebRTC] → answer sent to ${senderSocketId}`);
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    };

    // ── Incoming answer ────────────────────────────────────────────────────
    const onAnswer = async ({ senderSocketId, answer }) => {
      console.log(`[WebRTC] ← answer from ${senderSocketId}`);
      const pc = this.peerConnections.get(senderSocketId);
      if (!pc) return;
      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('[WebRTC] Error setting remote answer:', err);
      }
    };

    // ── Incoming ICE candidate ─────────────────────────────────────────────
    const onIce = async ({ senderSocketId, candidate }) => {
      const pc = this.peerConnections.get(senderSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // Ignore benign "Cannot add ICE candidate" errors after close
          if (!err.message?.includes('closed')) {
            console.warn('[WebRTC] ICE candidate error:', err.message);
          }
        }
      }
    };

    // ── Peer departure ─────────────────────────────────────────────────────
    const onPeerGone = ({ socketId }) => {
      console.log(`[WebRTC] Peer ${socketId} left – closing connection`);
      this.closePeerConnection(socketId);
    };

    this.socket.on('webrtc-offer', onOffer);
    this.socket.on('webrtc-answer', onAnswer);
    this.socket.on('webrtc-ice-candidate', onIce);
    this.socket.on('user-left', onPeerGone);
    this.socket.on('peer-left', onPeerGone);

    // Store refs for teardown
    this._boundHandlers = { onOffer, onAnswer, onIce, onPeerGone };
  }

  // ── Create a new RTCPeerConnection to a specific peer ───────────────────
  createPeerConnection(targetSocketId) {
    if (this.peerConnections.has(targetSocketId)) {
      const existing = this.peerConnections.get(targetSocketId);
      if (existing.connectionState !== 'closed' && existing.connectionState !== 'failed') {
        return existing;
      }
      // If closed/failed, recreate
      existing.close();
    }

    const config = getIceServers();
    const pc = new RTCPeerConnection(config);
    this.peerConnections.set(targetSocketId, pc);

    // ── Attach ALL local tracks so remote peer gets our audio + video ──────
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, this.localStream);
          console.log(`[WebRTC] Added local ${track.kind} track to pc for ${targetSocketId}`);
        } catch (e) {
          console.warn('[WebRTC] addTrack error:', e);
        }
      });
    } else {
      console.warn('[WebRTC] No local stream when creating peer connection!');
    }

    // ── ICE candidate → relay to peer via signaling server ────────────────
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit('webrtc-ice-candidate', { targetSocketId, candidate });
      }
    };

    pc.onicecandidateerror = (e) => {
      // Only log non-trivial errors
      if (e.errorCode !== 701) {
        console.warn(`[WebRTC] ICE candidate error (${e.errorCode}):`, e.errorText);
      }
    };

    // ── Remote tracks arrive → notify VideoRoom ────────────────────────────
    pc.ontrack = ({ streams, track }) => {
      console.log(`[WebRTC] ← remote ${track.kind} track from ${targetSocketId}`);
      if (streams && streams[0]) {
        this.onRemoteStreamAdded(targetSocketId, streams[0]);
      } else {
        // Build a MediaStream if event doesn't include one
        const ms = new MediaStream([track]);
        this.onRemoteStreamAdded(targetSocketId, ms);
      }
    };

    // ── Connection state monitoring + auto ICE restart ─────────────────────
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] ${targetSocketId} connection state: ${state}`);
      if (state === 'connected') {
        console.log(`[WebRTC] ✅ Connected to ${targetSocketId}`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC] ${targetSocketId} ICE state: ${state}`);
      if (state === 'failed') {
        console.warn(`[WebRTC] ICE failed for ${targetSocketId} – attempting restart`);
        this.attemptIceRestart(targetSocketId);
        this.socket.emit('webrtc-log-error', { targetSocketId, state, timestamp: new Date().toISOString() });
      }
    };

    pc.onsignalingstatechange = () => {
      console.log(`[WebRTC] ${targetSocketId} signaling state: ${pc.signalingState}`);
    };

    return pc;
  }

  // ── Send an SDP offer to a specific peer ──────────────────────────────────
  async initiateOffer(targetSocketId) {
    console.log(`[WebRTC] → initiating offer to ${targetSocketId}`);
    const pc = this.createPeerConnection(targetSocketId);

    // Don't send offer if already negotiating
    if (pc.signalingState !== 'stable') {
      console.warn(`[WebRTC] Skipping offer to ${targetSocketId} – signalingState: ${pc.signalingState}`);
      return;
    }

    try {
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(offer);
      this.socket.emit('webrtc-offer', { targetSocketId, offer });
      console.log(`[WebRTC] → offer sent to ${targetSocketId}`);
    } catch (err) {
      console.error('[WebRTC] Error creating offer:', err);
    }
  }

  // ── ICE restart after failure ──────────────────────────────────────────────
  async attemptIceRestart(targetSocketId) {
    const pc = this.peerConnections.get(targetSocketId);
    if (!pc || pc.connectionState === 'closed') return;

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      this.socket.emit('webrtc-offer', { targetSocketId, offer });
      console.log(`[WebRTC] ICE restart offer sent to ${targetSocketId}`);
    } catch (err) {
      console.error('[WebRTC] ICE restart failed:', err);
    }
  }

  // ── Close a single peer connection ────────────────────────────────────────
  closePeerConnection(targetSocketId) {
    const pc = this.peerConnections.get(targetSocketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(targetSocketId);
      this.onRemoteStreamRemoved(targetSocketId);
    }
  }

  // ── Update local stream on all peer connections (with renegotiation) ──────
  async updateLocalStream(newStream) {
    this.localStream = newStream;
    if (!newStream || this.peerConnections.size === 0) return;

    console.log('[WebRTC] Updating local stream on', this.peerConnections.size, 'peer(s)');
    for (const [targetSocketId, pc] of this.peerConnections.entries()) {
      if (pc.connectionState === 'closed') continue;
      const senders = pc.getSenders();
      let needsRenegotiation = false;

      for (const track of newStream.getTracks()) {
        const existingSender = senders.find(s => s.track?.kind === track.kind);
        if (existingSender) {
          // Replace existing track in-place (no renegotiation needed)
          await existingSender.replaceTrack(track).catch(e => console.warn('[WebRTC] replaceTrack error:', e));
        } else {
          // Add new track kind – requires renegotiation
          pc.addTrack(track, newStream);
          needsRenegotiation = true;
        }
      }

      if (needsRenegotiation) {
        await this.initiateOffer(targetSocketId);
      }
    }
  }

  // ── Tear down all connections + remove socket listeners ───────────────────
  destroy() {
    console.log('[WebRTC] Destroying manager, closing', this.peerConnections.size, 'connection(s)');
    this.peerConnections.forEach((pc, id) => {
      pc.close();
      this.onRemoteStreamRemoved(id);
    });
    this.peerConnections.clear();

    // Remove all socket listeners
    const { onOffer, onAnswer, onIce, onPeerGone } = this._boundHandlers;
    if (onOffer)    this.socket.off('webrtc-offer', onOffer);
    if (onAnswer)   this.socket.off('webrtc-answer', onAnswer);
    if (onIce)      this.socket.off('webrtc-ice-candidate', onIce);
    if (onPeerGone) { this.socket.off('user-left', onPeerGone); this.socket.off('peer-left', onPeerGone); }
  }
}
