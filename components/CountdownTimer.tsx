'use client'
import { useEffect, useState } from 'react'

export default function CountdownTimer({ endDate }: { endDate: string }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endDate).getTime() - Date.now()
      if (diff <= 0) return
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endDate])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex gap-4 mt-3">
      {[['d', 'days'], ['h', 'hrs'], ['m', 'min'], ['s', 'sec']].map(([k, label]) => (
        <div key={k} className="text-center">
          <div className="text-2xl font-black font-mono text-accent leading-none">
            {pad(time[k as keyof typeof time])}
          </div>
          <div className="text-[9px] font-mono text-muted uppercase tracking-widest mt-1">{label}</div>
        </div>
      ))}
    </div>
  )
}
