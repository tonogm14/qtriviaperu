/**
 * WhepPlayer — sub-second WebRTC video via WHEP (receive-only).
 * Requires a native dev/EAS build — does NOT work in Expo Go.
 *
 * Props:
 *   whepUrl      Full WHEP endpoint URL (e.g. https://host/live/<key>/whep)
 *   style        View style forwarded to the RTCView container
 *   onConnected  Called when the peer connection reaches 'connected'
 *   onFailed     Called on 'failed' | 'disconnected' | 'closed' state
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices as _mediaDevices,
} from 'react-native-webrtc';

interface Props {
  whepUrl: string;
  style?: object;
  onConnected?: () => void;
  onFailed?: () => void;
}

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export const WhepPlayer: React.FC<Props> = ({ whepUrl, style, onConnected, onFailed }) => {
  const [streamURL, setStreamURL] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Receive-only — no camera/mic needed
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.ontrack = (event: any) => {
        if (cancelled) return;
        const stream = event.streams?.[0];
        if (stream) setStreamURL(stream.toURL());
      };

      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        const state = (pc as any).connectionState;
        if (state === 'connected') {
          onConnected?.();
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          onFailed?.();
        }
      };

      try {
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);

        const resp = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        });

        if (!resp.ok) { onFailed?.(); return; }

        const answerSdp = await resp.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp } as any);
      } catch {
        if (!cancelled) onFailed?.();
      }
    }

    connect();

    return () => {
      cancelled = true;
      const pc = pcRef.current;
      if (pc) {
        try { pc.close(); } catch { /* ignore */ }
        pcRef.current = null;
      }
      setStreamURL(null);
    };
  }, [whepUrl]); // eslint-disable-line

  if (!streamURL) return <View style={[styles.blank, style]} />;

  return (
    <RTCView
      streamURL={streamURL}
      style={[styles.video, style]}
      objectFit="cover"
      mirror={false}
      zOrder={0}
    />
  );
};

const styles = StyleSheet.create({
  blank: { backgroundColor: '#000' },
  video: { backgroundColor: '#000' },
});
