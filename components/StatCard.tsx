import clsx from 'clsx'

interface Props {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'accent' | 'green' | 'gold'
  loading?: boolean
}

export default function StatCard({ label, value, sub, color = 'default', loading }: Props) {
  if (loading) {
    return (
      <div className="bg-surface border border-white/[0.07] rounded-xl p-4">
        <div className="skeleton h-2 w-16 mb-3" />
        <div className="skeleton h-8 w-20 mb-2" />
        <div className="skeleton h-2 w-24" />
      </div>
    )
  }

  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-colors">
      <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">{label}</div>
      <div className={clsx('text-2xl sm:text-3xl font-black leading-none count-up', {
        'text-white':   color === 'default',
        'text-accent':  color === 'accent',
        'text-accent2': color === 'green',
        'text-gold':    color === 'gold',
      })}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted mt-1.5 truncate">{sub}</div>}
    </div>
  )
}
