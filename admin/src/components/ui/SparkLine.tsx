interface SparkLineProps {
  data: number[]
  color?: string
  fill?: string
  height?: number
}

export function SparkLine({ data, color = 'var(--brand-500)', fill, height = 36 }: SparkLineProps) {
  if (!data || data.length < 2) return null
  const w = 200
  const h = height
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => [
    i * step,
    h - ((v - min) / range) * (h - 4) - 2,
  ])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${d} L ${w} ${h} L 0 ${h} Z`

  return (
    <svg
      className="spark-line"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ height }}
    >
      {fill && <path d={area} fill={fill} opacity={0.15} />}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
