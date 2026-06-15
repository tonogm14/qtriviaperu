import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { api } from '../services/api';

interface Props {
  streamUrl: string;
  style?: object;
}

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
  return `${base}${url}`;
}

export const YouTubePlayer: React.FC<Props> = ({ streamUrl, style }) => {
  const { width, height } = useWindowDimensions();
  const [isPlaying, setIsPlaying] = useState(false);
  const [offline, setOffline] = useState(false);
  const loadedUrlRef = useRef<string | null>(null);
  const resolvedUrl = resolveUrl(streamUrl);

  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
    p.muted = false;
  });

  const hasPlayedRef = useRef(false);
  const resolvedUrlRef = useRef<string>('');

  useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying: playing }: { isPlaying: boolean }) => {
      if (playing) {
        hasPlayedRef.current = true;
        setIsPlaying(true);
      } else if (hasPlayedRef.current && resolvedUrlRef.current) {
        // Stream stalled — reload entirely to re-fetch live edge
        hasPlayedRef.current = false;
        setTimeout(() => {
          player.replaceAsync(resolvedUrlRef.current)
            .then(() => player.play())
            .catch(() => setOffline(true));
        }, 1500);
      }
    });
    return () => sub.remove();
  }, [player]);

  const tryLoad = (url: string) => {
    hasPlayedRef.current = false;
    resolvedUrlRef.current = url;
    player.replaceAsync(url)
      .then(() => player.play())
      .catch(() => setOffline(true));
  };

  useEffect(() => {
    if (!resolvedUrl || resolvedUrl === loadedUrlRef.current) return;
    loadedUrlRef.current = resolvedUrl;
    setIsPlaying(false);
    setOffline(false);
    tryLoad(resolvedUrl);

    const t = setTimeout(() => {
      setIsPlaying(p => { if (!p) setOffline(true); return p; });
    }, 12000);
    return () => clearTimeout(t);
  }, [streamUrl]);

  // Retry every 5s when offline
  useEffect(() => {
    if (!offline || !resolvedUrl) return;
    const interval = setInterval(() => {
      setOffline(false);
      setIsPlaying(false);
      tryLoad(resolvedUrl);
      setTimeout(() => {
        setIsPlaying(p => { if (!p) setOffline(true); return p; });
      }, 12000);
    }, 5000);
    return () => clearInterval(interval);
  }, [offline, resolvedUrl]);

  if (!resolvedUrl || offline) {
    return (
      <View style={[styles.container, styles.fallback, style]}>
        <Text style={styles.dot}>📡</Text>
        <Text style={styles.title}>EN VIVO</Text>
        <Text style={styles.sub}>La transmisión comenzará en breve...</Text>
      </View>
    );
  }

  if (!isPlaying) {
    return <View style={[styles.container, style]} />;
  }

  return (
    <View style={[styles.container, { width, height }, style]} pointerEvents="none">
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ isFullscreenButtonHidden: true }}
        allowsPictureInPicture={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#000' },
  fallback: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0a0a0a' },
  dot: { fontSize: 36 },
  title: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  sub: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 6 },
});
