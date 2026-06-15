import React from 'react';
import { View, StyleSheet } from 'react-native';
import YoutubeIframe from 'react-native-youtube-iframe';

function extractVideoId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/))([\w-]{11})/);
  return m?.[1] ?? url;
}

interface Props {
  streamUrl: string;
  style?: object;
  play?: boolean;
}

export const YouTubePlayer: React.FC<Props> = ({ streamUrl, style, play = true }) => {
  const videoId = extractVideoId(streamUrl);

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <YoutubeIframe
        videoId={videoId}
        play={play}
        height="100%"
        width="100%"
        webViewStyle={{ opacity: 0.99 }}
        initialPlayerParams={{ controls: 0, modestbranding: 1, rel: 0 }}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});
