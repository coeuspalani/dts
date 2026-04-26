'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import StatCard from '@/components/StatCard'
import Toast, { useToast } from '@/components/Toast'
import Spinner from '@/components/Spinner'
import { getAdminStats, getAdminUsers, getChallenges, createChallenge, updateChallenge, deleteChallenge } from '@/lib/api-client'
import type { Challenge, User } from '@/lib/types'
import { Trash2, Pause, Play, CheckCircle, RefreshCw, Plus, X, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

const statusColors: Record<string, string> = {
  active:    'text-accent2 bg-accent2/10 border-accent2/20',
  upcoming:  'text-accent  bg-accent/10  border-accent/20',
  paused:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  completed: 'text-muted bg-white/5 border-white/10',
}

export default function AdminPage() {
  const { user }                   = useAuth()
  const router                     = useRouter()
  const { toast, show, hide }      = useToast()
  const [stats, setStats]          = useState<any>(null)
  const [challenges, setChallenges]= useState<Challenge[]>([])
  const [users, setUsers]          = useState<User[]>([])
  const [syncing, setSyncing]      = useState<string|null>(null)
  const [creating, setCreating]    = useState(false)
  const [showForm, setShowForm]    = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [form, setForm]            = useState({ title:'', start_date:'', end_date:'', status:'upcoming' })

  useEffect(() => { if (user && user.role !== 'admin') router.push('/dashboard') }, [user, router])

  const load = useCallback(async () => {
    try {
      const [s, c, u] = await Promise.all([getAdminStats(), getChallenges('all'), getAdminUsers()])
      setStats(s); setChallenges(Array.isArray(c) ? c : []); setUsers(u.users ?? [])
    } catch {}
    finally { setStatsLoading(false); setUsersLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.start_date || !form.end_date) { show('All fields required', 'error'); return }
    setCreating(true)
    try {
      await createChallenge(form)
      await load()
      setForm({ title:'', start_date:'', end_date:'', status:'upcoming' })
      setShowForm(false)
      show('Challenge created!')
    } catch (e: any) { show(e.message, 'error') }
    finally { setCreating(false) }
  }

  const handleStatus = async (id: string, status: string) => {
    if (status === 'completed') {
      // Use dedicated end-challenge endpoint that snapshots results + sends certs
      if (!confirm('End this challenge? Results will be finalized and certificates emailed to all participants.')) return
      setSyncing(id)
      try {
        const token = localStorage.getItem('dts_access')
        const res   = await fetch(`/api/challenges/${id}/end`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        const data = await res.json()
        if (data.success) {
          await load()
          show(`✓ Challenge ended. ${data.data.participants_finalized} results saved. ${data.data.certificates_sent} certificates sent.`)
        } else {
          show(data.error ?? 'Failed to end challenge', 'error')
        }
      } catch (e: any) { show(e.message, 'error') }
      finally { setSyncing(null) }
      return
    }
    try { await updateChallenge(id, { status }); await load(); show(`Challenge ${status}`) }
    catch (e: any) { show(e.message, 'error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this challenge?')) return
    try { await deleteChallenge(id); await load(); show('Deleted') }
    catch (e: any) { show(e.message, 'error') }
  }

  const handleSyncUser = async (lc: string) => {
    setSyncing(lc)
    const token = localStorage.getItem('dts_access')
    try {
      const res  = await fetch('/api/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcode_username: lc })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      await load(); show(`Synced ${lc}`)
    } catch (e: any) { show(e.message, 'error') }
    finally { setSyncing(null) }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (user?.role !== 'admin') return null

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Admin Panel</h1>
          <p className="text-[10px] font-mono text-muted mt-0.5">// CHALLENGE MANAGEMENT</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-accent text-white text-xs sm:text-sm font-bold rounded-lg hover:opacity-85 transition-all">
          {showForm ? <X size={13} /> : <Plus size={13} />}
          <span className="hidden sm:inline">{showForm ? 'Cancel' : 'New Challenge'}</span>
        </button>
        <Link href="/admin/results"
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface border border-white/[0.07] text-xs sm:text-sm font-semibold rounded-lg hover:border-accent/40 transition-all text-muted hover:text-white">
          <BarChart2 size={13} />
          <span className="hidden sm:inline">Results</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-6 fade-up-1">
        <StatCard loading={statsLoading} label="Total Users"       value={stats?.total_users ?? 0}        color="accent" />
        <StatCard loading={statsLoading} label="Active Challenges" value={stats?.active_challenges ?? 0}  color="green" />
        <StatCard loading={statsLoading} label="Participants"      value={stats?.total_participants ?? 0} color="gold" />
        <StatCard loading={statsLoading} label="Total Challenges"  value={challenges.length} />
      </div>

      <div className={clsx('grid gap-4 mb-6 fade-up-2', showForm ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
        {/* Create form */}
        {showForm && (
          <div className="bg-surface border border-accent/20 rounded-xl p-5">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4">// new challenge</div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Title</label>
                <input value={form.title} onChange={set('title')} placeholder="DSA Sprint — Week 4"
                  className="w-full px-3 py-2.5 text-sm font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Start</label>
                  <input type="date" value={form.start_date} onChange={set('start_date')} className="w-full px-3 py-2.5 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">End</label>
                  <input type="date" value={form.end_date} onChange={set('end_date')} className="w-full px-3 py-2.5 text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Status</label>
                <select value={form.status} onChange={set('status')} className="w-full px-3 py-2.5 text-sm font-mono">
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <button type="submit" disabled={creating}
                className="w-full py-2.5 bg-accent text-white text-sm font-bold rounded-lg hover:opacity-85 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {creating ? <><Spinner size={14} color="#fff" /> Creating...</> : 'Create Challenge'}
              </button>
            </form>
          </div>
        )}

        {/* Challenges list */}
        <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-white/[0.07] text-[10px] font-mono text-muted uppercase tracking-widest">
            // challenges
          </div>
          {challenges.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted font-mono">
              {statsLoading ? <Spinner size={20} /> : 'No challenges yet'}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {challenges.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{c.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColors[c.status]}`}>
                        {c.status}
                      </span>
                      <span className="text-[10px] font-mono text-muted hidden sm:inline">
                        {c.start_date} → {c.end_date}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {c.status === 'active'  && <button onClick={() => handleStatus(c.id,'paused')}    className="p-1.5 rounded-md text-muted hover:text-yellow-400 hover:bg-yellow-400/10 transition-all" title="Pause"><Pause size={13} /></button>}
                    {c.status === 'paused'  && <button onClick={() => handleStatus(c.id,'active')}    className="p-1.5 rounded-md text-muted hover:text-accent2 hover:bg-accent2/10 transition-all" title="Resume"><Play size={13} /></button>}
                    {(c.status === 'active' || c.status === 'paused') &&
                      <button onClick={() => handleStatus(c.id,'completed')} disabled={syncing === c.id} className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent/10 transition-all disabled:opacity-40" title="End Challenge">
                        {syncing === c.id ? <Spinner size={13} /> : <CheckCircle size={13} />}
                      </button>}
                    {c.status === 'completed' &&
                      <Link href="/admin/results" className="p-1.5 rounded-md text-muted hover:text-accent2 hover:bg-accent2/10 transition-all" title="View Results">
                        <BarChart2 size={13} />
                      </Link>}
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-all" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden fade-up-3">
        <div className="px-4 sm:px-5 py-3.5 border-b border-white/[0.07] flex items-center justify-between">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// all members</div>
          <span className="text-[10px] font-mono text-muted">{users.length} total</span>
        </div>
        {usersLoading ? (
          <div className="p-8 flex items-center justify-center gap-3">
            <Spinner size={18} /><span className="text-sm font-mono text-muted">Loading users...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {['Rank','Name','LC Handle','E','M','H','Points','Sync'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 sm:px-4 text-[9px] font-mono text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 sm:px-4 text-sm font-mono font-bold text-gold">{u.current_rank ? `#${u.current_rank}` : '—'}</td>
                    <td className="py-2.5 px-3 sm:px-4 text-sm font-semibold truncate max-w-[100px]">{u.name}</td>
                    <td className="py-2.5 px-3 sm:px-4 text-xs font-mono text-muted">{u.leetcode_username}</td>
                    <td className="py-2.5 px-3 sm:px-4 text-xs font-mono text-accent2">{u.easy_solved}</td>
                    <td className="py-2.5 px-3 sm:px-4 text-xs font-mono text-gold">{u.medium_solved}</td>
                    <td className="py-2.5 px-3 sm:px-4 text-xs font-mono text-danger">{u.hard_solved}</td>
                    <td className="py-2.5 px-3 sm:px-4 text-sm font-mono font-bold text-accent">{u.points}</td>
                    <td className="py-2.5 px-3 sm:px-4">
                      <button onClick={() => handleSyncUser(u.leetcode_username)} disabled={syncing === u.leetcode_username}
                        className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent/10 transition-all disabled:opacity-40">
                        {syncing === u.leetcode_username ? <Spinner size={12} /> : <RefreshCw size={12} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
