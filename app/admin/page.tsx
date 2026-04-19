'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import StatCard from '@/components/StatCard'
import Toast, { useToast } from '@/components/Toast'
import { getAdminStats, getAdminUsers, getChallenges, createChallenge, updateChallenge, deleteChallenge, syncMe } from '@/lib/api-client'
import type { Challenge, User } from '@/lib/types'
import { Trash2, Pause, Play, CheckCircle, RefreshCw, Plus } from 'lucide-react'

const statusColors: Record<string, string> = {
  active:    'text-accent2 bg-accent2/10 border-accent2/20',
  upcoming:  'text-accent bg-accent/10 border-accent/20',
  paused:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  completed: 'text-muted bg-white/5 border-white/10',
}

export default function AdminPage() {
  const { user }                              = useAuth()
  const router                               = useRouter()
  const { toast, show, hide }                = useToast()
  const [stats, setStats]                    = useState<any>(null)
  const [challenges, setChallenges]          = useState<Challenge[]>([])
  const [users, setUsers]                    = useState<User[]>([])
  const [syncing, setSyncing]                = useState<string | null>(null)
  const [creating, setCreating]              = useState(false)
  const [showForm, setShowForm]              = useState(false)
  const [form, setForm]                      = useState({ title: '', start_date: '', end_date: '', status: 'upcoming' })

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/dashboard')
  }, [user, router])

  const load = useCallback(async () => {
    try {
      const [s, c, u] = await Promise.all([getAdminStats(), getChallenges(), getAdminUsers()])
      setStats(s)
      setChallenges(Array.isArray(c) ? c : [])
      setUsers(u.users ?? [])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.start_date || !form.end_date) {
      show('All fields required', 'error'); return
    }
    setCreating(true)
    try {
      await createChallenge(form)
      await load()
      setForm({ title: '', start_date: '', end_date: '', status: 'upcoming' })
      setShowForm(false)
      show('Challenge created!')
    } catch (e: any) { show(e.message, 'error') }
    finally { setCreating(false) }
  }

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateChallenge(id, { status })
      await load()
      show(`Challenge ${status}`)
    } catch (e: any) { show(e.message, 'error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this challenge?')) return
    try {
      await deleteChallenge(id)
      await load()
      show('Challenge deleted')
    } catch (e: any) { show(e.message, 'error') }
  }

  const handleSyncUser = async (lc: string) => {
    setSyncing(lc)
    try {
      await syncMe(lc)
      await load()
      show(`Synced ${lc}`)
    } catch (e: any) { show(e.message, 'error') }
    finally { setSyncing(null) }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (user?.role !== 'admin') return null

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black">Admin Panel</h1>
          <p className="text-[11px] font-mono text-muted mt-0.5">// CHALLENGE MANAGEMENT</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:opacity-85 transition-all">
          <Plus size={14} /> New Challenge
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Users"       value={stats?.total_users ?? '—'}        color="accent" />
        <StatCard label="Active Challenges" value={stats?.active_challenges ?? '—'}  color="green" />
        <StatCard label="Participants"      value={stats?.total_participants ?? '—'} color="gold" />
        <StatCard label="Total Challenges"  value={challenges.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Create form */}
        {showForm && (
          <div className="bg-surface border border-white/[0.07] rounded-xl p-6">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4">// create challenge</div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Title</label>
                <input value={form.title} onChange={set('title')} placeholder="DSA Sprint — Week 4"
                  className="w-full px-3 py-2 text-sm font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Start Date</label>
                  <input type="date" value={form.start_date} onChange={set('start_date')}
                    className="w-full px-3 py-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">End Date</label>
                  <input type="date" value={form.end_date} onChange={set('end_date')}
                    className="w-full px-3 py-2 text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">Status</label>
                <select value={form.status} onChange={set('status')} className="w-full px-3 py-2 text-sm font-mono">
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <button type="submit" disabled={creating}
                className="w-full py-2.5 bg-accent text-white text-sm font-bold rounded-lg hover:opacity-85 transition-all disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Challenge'}
              </button>
            </form>
          </div>
        )}

        {/* Challenges list */}
        <div className={showForm ? '' : 'lg:col-span-2'}>
          <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.07] text-[10px] font-mono text-muted uppercase tracking-widest">
              // manage challenges
            </div>
            {challenges.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted font-mono">No challenges yet</div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {challenges.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{c.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColors[c.status]}`}>
                          {c.status}
                        </span>
                        <span className="text-[10px] font-mono text-muted">
                          {c.start_date} → {c.end_date}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.status === 'active' && (
                        <button onClick={() => handleStatus(c.id, 'paused')}
                          className="p-1.5 rounded-md text-muted hover:text-yellow-400 hover:bg-yellow-400/10 transition-all" title="Pause">
                          <Pause size={14} />
                        </button>
                      )}
                      {c.status === 'paused' && (
                        <button onClick={() => handleStatus(c.id, 'active')}
                          className="p-1.5 rounded-md text-muted hover:text-accent2 hover:bg-accent2/10 transition-all" title="Resume">
                          <Play size={14} />
                        </button>
                      )}
                      {(c.status === 'active' || c.status === 'paused') && (
                        <button onClick={() => handleStatus(c.id, 'completed')}
                          className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent/10 transition-all" title="End">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-all" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// all users</div>
          <span className="text-[10px] font-mono text-muted">{users.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['Rank','Name','LeetCode','Easy','Med','Hard','Points','Synced',''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[10px] font-mono text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-sm font-mono font-bold text-gold">{u.current_rank ? `#${u.current_rank}` : '—'}</td>
                  <td className="py-3 px-4 text-sm font-semibold">{u.name}</td>
                  <td className="py-3 px-4 text-xs font-mono text-muted">{u.leetcode_username}</td>
                  <td className="py-3 px-4 text-xs font-mono text-accent2">{u.easy_solved}</td>
                  <td className="py-3 px-4 text-xs font-mono text-gold">{u.medium_solved}</td>
                  <td className="py-3 px-4 text-xs font-mono text-danger">{u.hard_solved}</td>
                  <td className="py-3 px-4 text-sm font-mono font-bold text-accent">{u.points}</td>
                  <td className="py-3 px-4 text-[10px] font-mono text-muted">
                    {u.last_synced_at ? new Date(u.last_synced_at).toLocaleTimeString() : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => handleSyncUser(u.leetcode_username)}
                      disabled={syncing === u.leetcode_username}
                      className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent/10 transition-all disabled:opacity-40">
                      <RefreshCw size={12} className={syncing === u.leetcode_username ? 'animate-spin' : ''} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
