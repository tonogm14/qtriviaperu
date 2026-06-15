interface JuvQLogoProps {
  size?: number
  animated?: boolean
}

export function JuvQLogo({ size = 40, animated = true }: JuvQLogoProps) {
  const border = Math.round(size * 0.13)
  const sparkleSize = Math.round(size * 0.20)
  const sparkleTop = Math.round(size * 0.24)
  const sparkleLeft = Math.round(size / 2 - sparkleSize / 2)

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
        animation: animated ? 'juvq-float 3.5s ease-in-out infinite' : 'none',
      }}
    >
      {/* White ring */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${border}px solid white`,
        }}
      />
      {/* Yellow tail */}
      <div
        style={{
          position: 'absolute',
          bottom: -Math.round(size * 0.06),
          right: -Math.round(size * 0.02),
          width: Math.round(size * 0.34),
          height: Math.round(size * 0.18),
          backgroundColor: '#FACC15',
          borderRadius: 4,
          transform: 'rotate(35deg)',
        }}
      />
      {/* Pink square */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: Math.round(size * 0.06),
          width: Math.round(size * 0.14),
          height: Math.round(size * 0.14),
          backgroundColor: '#EC4899',
          borderRadius: 3,
          transform: 'rotate(35deg)',
        }}
      />
      {/* Center sparkle */}
      <svg
        viewBox="0 0 24 24"
        width={sparkleSize}
        height={sparkleSize}
        style={{ position: 'absolute', top: sparkleTop, left: sparkleLeft }}
      >
        <path
          d="M12 2c0.5 4.4 3.6 7.5 8 8-4.4 0.5-7.5 3.6-8 8-0.5-4.4-3.6-7.5-8-8 4.4-0.5 7.5-3.6 8-8z"
          fill="#EC4899"
        />
      </svg>
    </div>
  )
}
