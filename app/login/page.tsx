'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { login, register } = useAuth()
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({ name: '', email: '', password: '', leetcode_username: '' })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register({ name: form.name, email: form.email, password: form.password, leetcode_username: form.leetcode_username })
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left — form */}
      <div className="flex-1 flex flex-col justify-center px-10 max-w-md">
        <div className="mb-8">
          <div className="text-4xl font-black tracking-tight mb-1">
            D<span className="text-accent">T</span>S
          </div>
          <div className="text-[11px] font-mono text-muted tracking-widest">// DARE TO SOLVE</div>
        </div>

        <div className="flex gap-2 mb-8 bg-surface2 p-1 rounded-lg">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md capitalize transition-all
                ${mode === m ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}>
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Full Name</label>
              <input value={form.name} onChange={set('name')} placeholder="Palani Kumar"
                className="w-full px-4 py-2.5 text-sm font-mono" required />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com"
              className="w-full px-4 py-2.5 text-sm font-mono" required />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm font-mono" required />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">LeetCode Username</label>
              <input value={form.leetcode_username} onChange={set('leetcode_username')} placeholder="palani_codes"
                className="w-full px-4 py-2.5 text-sm font-mono" required />
              <p className="text-[10px] font-mono text-muted mt-1.5">We'll verify this against LeetCode instantly.</p>
            </div>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger font-mono">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-accent text-white font-bold rounded-lg hover:opacity-85 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2">
            {loading ? '...' : mode === 'login' ? 'Enter the Arena →' : 'Join DTS →'}
          </button>
        </form>

        {mode === 'login' && (
          <p className="mt-4 text-[11px] font-mono text-muted text-center">
            Admin? use <span className="text-accent">admin@dts.io</span>
          </p>
        )}
      </div>

      {/* Right — leaderboard preview */}
      <div className="hidden lg:flex flex-1 bg-surface border-l border-white/[0.07] flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent2/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-xs relative">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4">// live leaderboard</div>
          {[
            { rank: 1, name: 'Palani',  pts: 220, gold: true },
            { rank: 2, name: 'Arjun',   pts: 198 },
            { rank: 3, name: 'Meera',   pts: 175 },
            { rank: 4, name: 'Karthik', pts: 162 },
            { rank: 5, name: 'Divya',   pts: 149 },
          ].map(({ rank, name, pts, gold }) => (
            <div key={rank} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 mb-2">
              <span className={`font-mono text-xs font-bold w-4 text-center ${gold ? 'text-gold' : 'text-muted'}`}>{rank}</span>
              <span className="flex-1 text-sm font-semibold">{name}</span>
              <span className="text-xs font-mono text-accent2">{pts} pts</span>
            </div>
          ))}

          <div className="mt-6 bg-accent/5 border border-accent/15 rounded-xl p-4 text-center">
            <div className="text-xs font-mono text-muted mb-1">current challenge</div>
            <div className="text-sm font-bold text-accent">DSA Sprint — Week 3</div>
            <div className="text-[10px] font-mono text-muted mt-1">3 days left</div>
          </div>
        </div>
      </div>
    </div>
  )
}
