'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Toast, { useToast } from '@/components/Toast'
import Spinner from '@/components/Spinner'
import { ArrowLeft, Mail, RotateCcw, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

interface CompletedChallenge {
  id: string; title: string; start_date: string
  end_date: string; duration_days: number; participant_count: number
}
interface Result {
  id: string; name: string; email: string; leetcode_username: string
  final_rank: number; points_earned: number; solves_in_challenge: number
  certificate_id: string; certificate_sent: boolean; certificate_sent_at: string | null
}

const rankStyle: Record<number, string> = {
  1: 'bg-gold/10 text-gold border-gold/30',
  2: 'bg-white/8 text-white/60 border-white/20',
  3: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
}

export default function AdminResultsPage() {
  const { user }                          = useAuth()
  const router                            = useRouter()
  const { toast, show, hide }             = useToast()
  const [challenges, setChallenges]       = useState<CompletedChallenge[]>([])
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [results, setResults]             = useState<Result[]>([])
  const [selectedChallenge, setSelectedC] = useState<any>(null)
  const [loading, setLoading]             = useState(true)
  const [loadingResults, setLoadingRes]   = useState(false)
  const [resending, setResending]         = useState(false)

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/dashboard')
  }, [user, router])

  const getToken = () => localStorage.getItem('dts_access') ?? ''

  // Load completed challenges
  useEffect(() => {
    fetch('/api/admin/results', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setChallenges(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Load results for selected challenge
  const loadResults = useCallback(async (id: string) => {
    setLoadingRes(true)
    try {
      const res  = await fetch(`/api/admin/results?challenge_id=${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (data.success) {
        setResults(data.data.results)
        setSelectedC(data.data.challenge)
      }
    } catch {} finally { setLoadingRes(false) }
  }, [])

  const handleSelect = (id: string) => {
    if (selectedId === id) { setSelectedId(null); setResults([]); setSelectedC(null); return }
    setSelectedId(id)
    loadResults(id)
  }

  const handleResend = async (challenge_id: string) => {
    setResending(true)
    try {
      const res  = await fetch('/api/admin/results', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id }),
      })
      const data = await res.json()
      if (data.success) {
        show(`✓ ${data.data?.sent ?? 0} certificates resent`)
        loadResults(challenge_id)
      } else {
        show(data.error ?? 'Failed to resend', 'error')
      }
    } catch (e: any) { show(e.message, 'error') }
    finally { setResending(false) }
  }

  if (user?.role !== 'admin') return null

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/admin')}
          className="p-2 rounded-lg text-muted hover:text-white hover:bg-white/[0.05] transition-all">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Challenge Results</h1>
          <p className="text-[10px] font-mono text-muted mt-0.5">// COMPLETED CHALLENGES & CERTIFICATES</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20">
          <Spinner size={20} /><span className="text-sm font-mono text-muted">Loading...</span>
        </div>
      ) : challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Trophy size={40} className="text-muted" />
          <p className="text-sm font-mono text-muted">No completed challenges yet</p>
          <button onClick={() => router.push('/admin')}
            className="text-xs font-mono text-accent hover:opacity-70">
            Go to Admin →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => (
            <div key={c.id} className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
              {/* Challenge header row */}
              <button
                onClick={() => handleSelect(c.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{c.title}</span>
                    <span className="text-[9px] font-mono text-muted bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.07]">
                      COMPLETED
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted mt-1">
                    {new Date(c.start_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    {' → '}
                    {new Date(c.end_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    {' · '}{c.participant_count} participants
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedId === c.id && (
                    <button
                      onClick={e => { e.stopPropagation(); handleResend(c.id) }}
                      disabled={resending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-all disabled:opacity-50">
                      {resending ? <Spinner size={11} /> : <RotateCcw size={11} />}
                      Resend Certs
                    </button>
                  )}
                  {selectedId === c.id
                    ? <ChevronUp size={14} className="text-muted" />
                    : <ChevronDown size={14} className="text-muted" />
                  }
                </div>
              </button>

              {/* Results table */}
              {selectedId === c.id && (
                <div className="border-t border-white/[0.07]">
                  {loadingResults ? (
                    <div className="flex items-center justify-center gap-3 py-8">
                      <Spinner size={16} /><span className="text-xs font-mono text-muted">Loading results...</span>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="p-6 text-center text-sm font-mono text-muted">No results found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-white/[0.07]">
                            {['Rank','Name','Email','Solves','Points','Certificate','Status'].map(h => (
                              <th key={h} className="text-left py-2.5 px-4 text-[9px] font-mono text-muted uppercase tracking-widest whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.map(r => (
                            <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-4">
                                <span className={clsx(
                                  'inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold font-mono border',
                                  rankStyle[r.final_rank] ?? 'text-muted bg-white/[0.03] border-white/[0.08]'
                                )}>
                                  {r.final_rank}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm font-semibold">{r.name}</td>
                              <td className="py-3 px-4 text-xs font-mono text-muted">{r.email}</td>
                              <td className="py-3 px-4 text-sm font-mono">{r.solves_in_challenge}</td>
                              <td className="py-3 px-4 text-sm font-mono font-bold text-accent2">{r.points_earned}</td>
                              <td className="py-3 px-4 text-[10px] font-mono text-accent">{r.certificate_id}</td>
                              <td className="py-3 px-4">
                                {r.certificate_sent ? (
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-accent2">
                                    <Mail size={10} /> Sent
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-muted">Pending</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
