import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SparkleMotif } from './JuvMotifs';

interface JuvQLogoProps {
  size?: number;
  animated?: boolean;
}

export const JuvQLogo: React.FC<JuvQLogoProps> = ({ size = 96, animated = false }) => {
  const translateY = useSharedValue(0);
  const rotateAngle = useSharedValue(-2);

  useEffect(() => {
    if (!animated) return;
    translateY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1750, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    rotateAngle.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 1750, easing: Easing.inOut(Easing.sin) }),
        withTiming(-2, { duration: 1750, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [animated, translateY, rotateAngle]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotateAngle.value}deg` },
    ],
  }));

  const sparkleSize = Math.round(size * 0.20);

  return (
    <Animated.View style={[{ width: size, height: size }, animated ? animStyle : {}]}>
      {/* White ring */}
      <View
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: size / 2,
          borderWidth: Math.round(size * 0.13),
          borderColor: 'white',
        }}
      />
      {/* Yellow tail */}
      <View
        style={{
          position: 'absolute',
          bottom: -Math.round(size * 0.06),
          right: -Math.round(size * 0.02),
          width: Math.round(size * 0.34),
          height: Math.round(size * 0.18),
          backgroundColor: '#FACC15',
          borderRadius: 4,
          transform: [{ rotate: '35deg' }],
        }}
      />
      {/* Pink square */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: Math.round(size * 0.06),
          width: Math.round(size * 0.14),
          height: Math.round(size * 0.14),
          backgroundColor: '#EC4899',
          borderRadius: 3,
          transform: [{ rotate: '35deg' }],
        }}
      />
      {/* Center sparkle */}
      <View
        style={{
          position: 'absolute',
          top: Math.round(size * 0.24),
          left: size / 2 - sparkleSize / 2,
        }}
      >
        <SparkleMotif size={sparkleSize} color="#EC4899" />
      </View>
    </Animated.View>
  );
};
