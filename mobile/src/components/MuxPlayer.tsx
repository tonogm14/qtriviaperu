import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

interface Props {
  streamUrl: string;
  style?: object;
}

export const MuxPlayer: React.FC<Props> = ({ streamUrl, style }) => {
  const player = useVideoPlayer(streamUrl, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="cover"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});
