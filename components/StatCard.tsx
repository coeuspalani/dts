import clsx from 'clsx'

interface Props {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'accent' | 'green' | 'gold'
}

export default function StatCard({ label, value, sub, color = 'default' }: Props) {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl p-4">
      <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">{label}</div>
      <div className={clsx('text-3xl font-black leading-none', {
        'text-white':  color === 'default',
        'text-accent': color === 'accent',
        'text-accent2': color === 'green',
        'text-gold':   color === 'gold',
      })}>{value}</div>
      {sub && <div className="text-[11px] font-mono text-muted mt-1.5">{sub}</div>}
    </div>
  )
}
