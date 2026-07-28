// Real Multi-Peer WebRTC & TURN Relay Service for LinguaVersa
// Full fix: ICE candidate buffering + multi-STUN/TURN fallback + per-peer MediaStream management + Perfect Negotiation.

export class WebRTCManager {
  constructor(socket, localStream, iceServers, onRemoteStreamAdded, onRemoteStreamRemoved, onIceStateChange) {
    this.socket              = socket;
    this.localStream         = localStream;
    this.iceServers          = iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
    this.onRemoteStreamAdded = onRemoteStreamAdded;
    this.onRemoteStreamRemoved = onRemoteStreamRemoved;
    this.onIceStateChange    = onIceStateChange;
    
    this.peerConnections     = new Map();   // socketId → RTCPeerConnection
    this._peerStreams        = new Map();   // socketId → MediaStream
    this._iceBuffers         = new Map();   // socketId → RTCIceCandidate[]
    this._boundHandlers      = {};
    
    // Perfect negotiation state
    this.myRole = 'polite'; // Default to polite, updated by caller

    console.log('[WebRTC] Manager initialized with local tracks:',
      localStream?.getTracks().map(t => `${t.kind}(${t.readyState})`).join(', ') || 'none');
    this.setupSocketListeners();
  }

  setRole(role) {
    this.myRole = role;
    console.log(`[WebRTC] My negotiation role set to: ${this.myRole}`);
  }

  setupSocketListeners() {
    // ── Incoming offer ─────────────────────────────────────────────────────
    const onOffer = async ({ senderSocketId, offer }) => {
      console.log(`[WebRTC] ← offer from ${senderSocketId}`);
      const pc = this.createPeerConnection(senderSocketId);
      
      const offerCollision = pc.makingOffer || pc.signalingState !== 'stable';
      pc.ignoreOffer = !this.isPolite() && offerCollision;

      if (pc.ignoreOffer) {
        console.log(`[WebRTC] Ignoring offer from ${senderSocketId} (I am impolite and there is a collision)`);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await this.flushIceBuffer(senderSocketId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket.emit('webrtc-answer', { targetSocketId: senderSocketId, answer });
        console.log(`[WebRTC] → answer sent to ${senderSocketId}`);
      } catch (err) {
        console.error('[WebRTC] Offer handling error:', err);
      }
    };

    // ── Incoming answer ─────────────────────────────────────────────────────
    const onAnswer = async ({ senderSocketId, answer }) => {
      console.log(`[WebRTC] ← answer from ${senderSocketId}`);
      const pc = this.peerConnections.get(senderSocketId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await this.flushIceBuffer(senderSocketId, pc);
      } catch (err) {
        console.error('[WebRTC] Answer handling error:', err);
      }
    };

    // ── Incoming ICE candidate ──────────────────────────────────────────────
    const onIce = async ({ senderSocketId, candidate }) => {
      const pc = this.peerConnections.get(senderSocketId);
      
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          if (pc.ignoreOffer) return;
          await pc.addIceCandidate(iceCandidate);
        } else {
          // Buffer until remote description is set
          if (!this._iceBuffers.has(senderSocketId)) {
            this._iceBuffers.set(senderSocketId, []);
          }
          this._iceBuffers.get(senderSocketId).push(candidate);
        }
      } catch (err) {
        if (!err.message?.includes('closed')) {
          console.warn('[WebRTC] ICE candidate error:', err.message);
        }
      }
    };

    // ── Peer departure ──────────────────────────────────────────────────────
    const onPeerGone = ({ socketId }) => {
      console.log(`[WebRTC] Peer ${socketId} left`);
      this.closePeerConnection(socketId);
    };

    this.socket.on('webrtc-offer',         onOffer);
    this.socket.on('webrtc-answer',        onAnswer);
    this.socket.on('webrtc-ice-candidate', onIce);
    this.socket.on('user-left',            onPeerGone);
    this.socket.on('peer-left',            onPeerGone);
    this._boundHandlers = { onOffer, onAnswer, onIce, onPeerGone };
  }

  isPolite() {
    return this.myRole === 'polite';
  }

  async flushIceBuffer(targetSocketId, pc) {
    const buffer = this._iceBuffers.get(targetSocketId) || [];
    while (buffer.length > 0) {
      const candidate = buffer.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] Error adding buffered ICE candidate:', err.message);
      }
    }
  }

  // ── Create RTCPeerConnection ──────────────────────────────────────────────
  createPeerConnection(targetSocketId) {
    const existing = this.peerConnections.get(targetSocketId);
    if (existing && existing.connectionState !== 'closed' && existing.connectionState !== 'failed') {
      return existing;
    }
    existing?.close();

    const config = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10, 
      bundlePolicy: 'max-bundle', 
      rtcpMuxPolicy: 'require'
    };

    const pc = new RTCPeerConnection(config);
    pc.makingOffer = false;
    pc.ignoreOffer = false;
    this.peerConnections.set(targetSocketId, pc);

    // ── Attach local tracks ─────────────────────────────────────────────────
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, this.localStream);
          console.log(`[WebRTC] Added local ${track.kind} track to pc for ${targetSocketId}`);
        } catch (e) { console.warn('[WebRTC] addTrack error:', e); }
      });
    }

    // ── Perfect Negotiation trigger ─────────────────────────────────────────
    pc.onnegotiationneeded = async () => {
      console.log(`[WebRTC] Negotiation needed for ${targetSocketId}`);
      try {
        pc.makingOffer = true;
        await pc.setLocalDescription();
        this.socket.emit('webrtc-offer', { targetSocketId, offer: pc.localDescription });
        console.log(`[WebRTC] → offer sent to ${targetSocketId}`);
      } catch (err) {
        console.error('[WebRTC] Negotiation error:', err);
      } finally {
        pc.makingOffer = false;
      }
    };

    // ── ICE candidate relay ─────────────────────────────────────────────────
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit('webrtc-ice-candidate', { targetSocketId, candidate });
      }
    };

    pc.onicecandidateerror = (e) => {
      if (e.errorCode !== 701) console.warn(`[WebRTC] ICE error (${e.errorCode}): ${e.errorText}`);
    };

    // ── Remote track event ──────────────────────────────────────────────────
    pc.ontrack = ({ track, streams }) => {
      console.log(`[WebRTC] ← remote ${track.kind} track from ${targetSocketId}`);
      let peerStream = this._peerStreams.get(targetSocketId);
      if (!peerStream) {
        peerStream = new MediaStream();
        this._peerStreams.set(targetSocketId, peerStream);
      }

      const existingIds = peerStream.getTracks().map(t => t.id);
      if (!existingIds.includes(track.id)) {
        try {
          peerStream.addTrack(track);
        } catch (e) {
          console.warn('[WebRTC] addTrack on peerStream failed:', e);
        }
      }

      const trackCount = peerStream.getTracks().length;
      const hasVideo   = peerStream.getVideoTracks().some(t => t.readyState === 'live');
      console.log(`[WebRTC] Peer ${targetSocketId} stream updated: ${trackCount} track(s), hasVideo=${hasVideo}`);

      this.onRemoteStreamAdded(targetSocketId, peerStream, trackCount, hasVideo);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${targetSocketId}: ${pc.connectionState}`);
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC] ICE connection state for ${targetSocketId}: ${state}`);
      if (this.onIceStateChange) this.onIceStateChange(targetSocketId, state);
      
      if (state === 'failed') {
        console.warn(`[WebRTC] ICE failed for ${targetSocketId} – attempting restart`);
        this.attemptIceRestart(targetSocketId);
        this.socket.emit('webrtc-log-error', { targetSocketId, state, timestamp: new Date().toISOString() });
      }
    };

    return pc;
  }

  // ── Manual Offer (for legacy support if needed) ─────────────────────────
  async initiateOffer(targetSocketId) {
    // With perfect negotiation, we usually just let onnegotiationneeded fire.
    // We can force it by calling createPeerConnection.
    this.createPeerConnection(targetSocketId);
  }

  // ── ICE restart ────────────────────────────────────────────────────────────
  async attemptIceRestart(targetSocketId) {
    const pc = this.peerConnections.get(targetSocketId);
    if (!pc || pc.connectionState === 'closed') return;
    try {
      pc.makingOffer = true;
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      this.socket.emit('webrtc-offer', { targetSocketId, offer });
      console.log(`[WebRTC] ICE restart sent to ${targetSocketId}`);
    } catch (err) {
      console.error('[WebRTC] ICE restart error:', err);
    } finally {
      pc.makingOffer = false;
    }
  }

  // ── Update local stream ────────────────────────────────────────────────────
  async updateLocalStream(newStream) {
    this.localStream = newStream;
    if (!newStream || this.peerConnections.size === 0) return;
    console.log('[WebRTC] Updating local stream on', this.peerConnections.size, 'peer(s)');

    for (const [targetSocketId, pc] of this.peerConnections.entries()) {
      if (pc.connectionState === 'closed') continue;
      const senders = pc.getSenders();

      for (const track of newStream.getTracks()) {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          await sender.replaceTrack(track).catch(e => console.warn('[WebRTC] replaceTrack error:', e));
        } else {
          pc.addTrack(track, newStream);
          // onnegotiationneeded will fire automatically.
        }
      }
    }
  }

  // ── Close connection ───────────────────────────────────────────────────────
  closePeerConnection(targetSocketId) {
    const pc = this.peerConnections.get(targetSocketId);
    if (pc) { pc.close(); this.peerConnections.delete(targetSocketId); }
    this._peerStreams.delete(targetSocketId);
    this._iceBuffers.delete(targetSocketId);
    this.onRemoteStreamRemoved(targetSocketId);
  }

  // ── Teardown ───────────────────────────────────────────────────────────────
  destroy() {
    console.log('[WebRTC] Destroying manager');
    this.peerConnections.forEach((pc, id) => { pc.close(); this.onRemoteStreamRemoved(id); });
    this.peerConnections.clear();
    this._peerStreams.clear();
    this._iceBuffers.clear();

    const { onOffer, onAnswer, onIce, onPeerGone } = this._boundHandlers;
    if (onOffer)    this.socket.off('webrtc-offer',         onOffer);
    if (onAnswer)   this.socket.off('webrtc-answer',        onAnswer);
    if (onIce)      this.socket.off('webrtc-ice-candidate', onIce);
    if (onPeerGone) { this.socket.off('user-left', onPeerGone); this.socket.off('peer-left', onPeerGone); }
  }
}
