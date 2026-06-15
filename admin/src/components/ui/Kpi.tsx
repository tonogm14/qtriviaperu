import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { SparkLine } from './SparkLine'

interface KpiProps {
  label: string
  value: string | number
  delta?: string
  trend?: 'up' | 'down' | 'flat'
  sub?: string
  sparkData?: number[]
  sparkColor?: string
  sparkFill?: string
  icon?: LucideIcon
}

export function Kpi({ label, value, delta, trend, sub, sparkData, sparkColor, sparkFill, icon: Icon }: KpiProps) {
  return (
    <div className="kpi-card card card-pad fade-in">
      <div className="kpi-label">
        {Icon && <Icon size={13} strokeWidth={2} />}
        {label}
      </div>
      <div className="kpi-value">{value}</div>
      {delta && (
        <div className={`kpi-delta kpi-delta-${trend ?? 'flat'}`}>
          {trend === 'up' && <TrendingUp size={13} strokeWidth={2.2} />}
          {trend === 'down' && <TrendingDown size={13} strokeWidth={2.2} />}
          <span>{delta}</span>
          {sub && <span className="kpi-sub">{sub}</span>}
        </div>
      )}
      {sparkData && (
        <SparkLine
          data={sparkData}
          color={sparkColor ?? 'var(--brand-500)'}
          fill={sparkFill}
          height={36}
        />
      )}
    </div>
  )
}
