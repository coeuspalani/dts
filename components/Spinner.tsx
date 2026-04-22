// Beautiful loading spinner component used everywhere
export default function Spinner({ size = 16, color = '#7c6af7' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spin" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// Full page loader
export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-4 z-50">
      <div className="text-2xl font-black tracking-tight">
        D<span className="text-accent">T</span>S
      </div>
      <Spinner size={28} />
      <p className="text-xs font-mono text-muted tracking-widest">{label}</p>
    </div>
  )
}

// Skeleton card
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl p-4 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3 ${i === 0 ? 'w-1/3' : i === 1 ? 'w-full' : 'w-2/3'}`} />
      ))}
    </div>
  )
}

// Skeleton stat card
export function SkeletonStat() {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl p-4">
      <div className="skeleton h-2 w-16 mb-3" />
      <div className="skeleton h-8 w-20 mb-2" />
      <div className="skeleton h-2 w-24" />
    </div>
  )
}

// Skeleton table row
export function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="py-3 px-4"><div className="skeleton h-3 w-6" /></td>
      <td className="py-3 px-4"><div className="skeleton h-3 w-24" /></td>
      <td className="py-3 px-4"><div className="skeleton h-3 w-20" /></td>
      <td className="py-3 px-4"><div className="skeleton h-3 w-10 ml-auto" /></td>
      <td className="py-3 px-4"><div className="skeleton h-3 w-10 ml-auto" /></td>
    </tr>
  )
}
