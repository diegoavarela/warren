interface MetricCardProps {
  title: string
  value: string
  className?: string
}

export function MetricCard({ title, value, className = '' }: MetricCardProps) {
  return (
    <div className="metric-card">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <p className={`text-2xl font-bold ${className}`}>{value}</p>
    </div>
  )
}