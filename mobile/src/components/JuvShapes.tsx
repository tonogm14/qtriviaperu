import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import {
  SparkleMotif,
  ChakanaMotif,
  SquiggleMotif,
  SolMotif,
  DotMotif,
  MountainMotif,
} from './JuvMotifs';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ShapeConfig {
  Component: React.FC<{ size: number; color: string }>;
  size: number;
  top: number;
  left: number;
  color: string;
  rot: number;
  duration: number;
}

const ALL_SHAPES: ShapeConfig[] = [
  { Component: SparkleMotif,  size: 22, top: SCREEN_H * 0.08, left: SCREEN_W * 0.10, color: '#FACC15', rot: 0,   duration: 4000 },
  { Component: ChakanaMotif,  size: 26, top: SCREEN_H * 0.14, left: SCREEN_W * 0.82, color: '#F472B6', rot: 10,  duration: 5000 },
  { Component: SquiggleMotif, size: 36, top: SCREEN_H * 0.32, left: SCREEN_W * 0.06, color: '#34D399', rot: -10, duration: 6000 },
  { Component: SolMotif,      size: 20, top: SCREEN_H * 0.28, left: SCREEN_W * 0.88, color: '#FACC15', rot: 0,   duration: 4000 },
  { Component: SparkleMotif,  size: 14, top: SCREEN_H * 0.52, left: SCREEN_W * 0.86, color: '#34D399', rot: 30,  duration: 5000 },
  { Component: DotMotif,      size: 10, top: SCREEN_H * 0.60, left: SCREEN_W * 0.08, color: '#FACC15', rot: 0,   duration: 4000 },
  { Component: SquiggleMotif, size: 30, top: SCREEN_H * 0.70, left: SCREEN_W * 0.76, color: '#F472B6', rot: 14,  duration: 6000 },
  { Component: MountainMotif, size: 22, top: SCREEN_H * 0.72, left: SCREEN_W * 0.14, color: '#60A5FA', rot: 0,   duration: 5000 },
  { Component: SparkleMotif,  size: 18, top: SCREEN_H * 0.86, left: SCREEN_W * 0.70, color: '#FACC15', rot: 0,   duration: 4000 },
  { Component: DotMotif,      size: 8,  top: SCREEN_H * 0.40, left: SCREEN_W * 0.24, color: '#EC4899', rot: 0,   duration: 5000 },
];

const FloatingShape: React.FC<{
  config: ShapeConfig;
  delay: number;
}> = ({ config, delay }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: config.duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: config.duration / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(4, { duration: config.duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: config.duration / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [config.duration, delay, translateX, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${config.rot}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: config.top,
          left: config.left,
        },
        animStyle,
      ]}
    >
      <config.Component size={config.size} color={config.color} />
    </Animated.View>
  );
};

interface JuvShapesProps {
  density?: number;
  seed?: number;
}

export const JuvShapes: React.FC<JuvShapesProps> = ({ density = 1, seed = 0 }) => {
  const count = Math.max(3, Math.ceil(ALL_SHAPES.length * density));
  const start = seed % 3;
  const shapes = ALL_SHAPES.slice(start, start + count);

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      {shapes.map((s, i) => (
        <FloatingShape key={i} config={s} delay={i * 300} />
      ))}
    </View>
  );
};
