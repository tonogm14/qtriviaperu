import React from 'react';
import Svg, { Path, Circle, Rect, Text as SvgText } from 'react-native-svg';

interface MotifProps {
  size?: number;
  color?: string;
}

// Chakana — Andean cross outline + center dot
export const ChakanaMotif: React.FC<MotifProps> = ({ size = 24, color = '#FACC15' }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Path
      d="M9 2h6v3h3v3h3v6h-3v3h-3v3H9v-3H6v-3H3V8h3V5h3z"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={12} r={2} fill={color} />
  </Svg>
);

// Inti — sun with 8 rect rays
export const SolMotif: React.FC<MotifProps> = ({ size = 24, color = '#FACC15' }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Circle cx={12} cy={12} r={4} fill={color} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <Rect
        key={a}
        x={11.2}
        y={0.5}
        width={1.6}
        height={4.2}
        rx={0.8}
        fill={color}
        transform={`rotate(${a} 12 12)`}
      />
    ))}
  </Svg>
);

// Sparkle — 4-point star
export const SparkleMotif: React.FC<MotifProps> = ({ size = 24, color = '#F472B6' }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Path
      d="M12 2c0.5 4.4 3.6 7.5 8 8-4.4 0.5-7.5 3.6-8 8-0.5-4.4-3.6-7.5-8-8 4.4-0.5 7.5-3.6 8-8z"
      fill={color}
    />
  </Svg>
);

// Squiggle wave
export const SquiggleMotif: React.FC<MotifProps> = ({ size = 32, color = '#34D399' }) => (
  <Svg viewBox="0 0 32 12" width={size} height={size * 12 / 32}>
    <Path
      d="M2 6 Q 6 1, 10 6 T 18 6 T 26 6 T 30 6"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
  </Svg>
);

// Filled dot
export const DotMotif: React.FC<MotifProps> = ({ size = 12, color = '#FACC15' }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Circle cx={12} cy={12} r={9} fill={color} />
  </Svg>
);

// Mountain — stroked triangle
export const MountainMotif: React.FC<MotifProps> = ({ size = 24, color = '#60A5FA' }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Path
      d="M3 21 L12 5 L21 21 Z"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
  </Svg>
);

// Heart
export const HeartMotif: React.FC<MotifProps> = ({ size = 20, color = '#EC4899' }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Path
      d="M12 21s-7.5-4.5-9.5-9.5C1.5 8 4 4.5 7.5 4.5c2 0 3.5 1 4.5 2.5 1-1.5 2.5-2.5 4.5-2.5 3.5 0 6 3.5 5 7-2 5-9.5 9.5-9.5 9.5z"
      fill={color}
    />
  </Svg>
);

// Coin S/
export const CoinPEMotif: React.FC<MotifProps> = ({ size = 26, color = '#FACC15' }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Circle cx={12} cy={12} r={10} fill={color} />
    <Circle
      cx={12}
      cy={12}
      r={8}
      fill="none"
      stroke="#92400E"
      strokeWidth={0.8}
      strokeDasharray="1.5 1.2"
    />
    <SvgText
      x={12}
      y={16}
      textAnchor="middle"
      fontSize={11}
      fontWeight="900"
      fill="#92400E"
    >
      S/
    </SvgText>
  </Svg>
);
