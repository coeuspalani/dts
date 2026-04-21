'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/Spinner'
import Toast, { useToast } from '@/components/Toast'
import { useAuth } from '@/hooks/useAuth'
import { ExternalLink, Bookmark, CheckCircle, RotateCcw, ChevronDown, ChevronUp, Search, X, SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'

interface Question {
  id: string; title: string; difficulty: string
  leetcode_url: string | null; leetcode_id: number | null
  has_leetcode: boolean; topic_name: string; topic_order: number
  order_index: number; status: string
}
interface Topic { id: string; name: string; order_index: number; total: number; with_lc: number }
interface Sheet { id: string; name: string; slug: string; description: string; source_url: string; question_topics: Topic[] }

const diffColor: Record<string, string> = {
  easy:    'text-accent2 bg-accent2/10 border-accent2/20',
  medium:  'text-gold    bg-gold/10    border-gold/20',
  hard:    'text-danger  bg-danger/10  border-danger/20',
  unknown: 'text-muted   bg-white/5    border-white/10',
}

const statusConfig: Record<string, { icon: any; color: string; label: string; next: string }> = {
  unsolved:   { icon: null,          color: 'text-muted',    label: '',          next: 'solved'     },
  solved:     { icon: CheckCircle,   color: 'text-accent2',  label: 'Solved',    next: 'bookmarked' },
  bookmarked: { icon: Bookmark,      color: 'text-gold',     label: 'Saved',     next: 'revisit'    },
  revisit:    { icon: RotateCcw,     color: 'text-accent',   label: 'Revisit',   next: 'unsolved'   },
}

export default function ProblemsPage() {
  const { user }                  = useAuth()
  const { toast, show, hide }     = useToast()
  const [sheets, setSheets]       = useState<Sheet[]>([])
  const [activeSheet, setSheet]   = useState('striver-a2z')
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [sheetsLoading, setShL]   = useState(true)

  // Filters
  const [search, setSearch]       = useState('')
  const [activeTopic, setTopic]   = useState('')
  const [activeDiff, setDiff]     = useState('')
  const [lcOnly, setLcOnly]       = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // UI state
  const [collapsedTopics, setCollapsed] = useState<Record<string, boolean>>({})
  const [updatingId, setUpdatingId]     = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch sheets
  useEffect(() => {
    fetch('/api/sheets').then(r => r.json()).then(d => {
      if (d.success) setSheets(d.data)
    }).finally(() => setShL(false))
  }, [])

  // Fetch questions
  const loadQuestions = useCallback(async (searchVal = search) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('dts_access')
      const params = new URLSearchParams({ sheet: activeSheet, limit: '500' })
      if (activeTopic) params.set('topic', activeTopic)
      if (activeDiff)  params.set('difficulty', activeDiff)
      if (lcOnly)      params.set('has_lc', 'true')
      if (searchVal.trim()) params.set('q', searchVal.trim())

      const res  = await fetch(`/api/questions?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data.success) { setQuestions(data.data.questions); setTotal(data.data.total) }
    } catch {} finally { setLoading(false) }
  }, [activeSheet, activeTopic, activeDiff, lcOnly, search])

  useEffect(() => { loadQuestions() }, [activeSheet, activeTopic, activeDiff, lcOnly])

  const handleSearch = (val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadQuestions(val), 350)
  }

  // Update progress
  const updateStatus = async (q: Question, newStatus: string) => {
    if (!user) { show('Please login to track progress', 'error'); return }
    setUpdatingId(q.id)
    try {
      const token = localStorage.getItem('dts_access')
      const res   = await fetch(`/api/questions/${q.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (data.success) {
        setQuestions(prev => prev.map(p => p.id === q.id ? { ...p, status: newStatus } : p))
        if (newStatus === 'solved') show(`✓ ${q.title} marked solved!`)
      }
    } catch { show('Failed to update', 'error') }
    finally { setUpdatingId(null) }
  }

  // Group by topic
  const byTopic = questions.reduce<Record<string, Question[]>>((acc, q) => {
    const k = q.topic_name || 'Misc'
    if (!acc[k]) acc[k] = []
    acc[k].push(q)
    return acc
  }, {})

  const topicOrder = [...new Set(questions.map(q => q.topic_name))]

  // Progress per topic
  const currentSheet = sheets.find(s => s.slug === activeSheet)
  const topicProgress = currentSheet?.question_topics.reduce<Record<string, { total: number; solved: number }>>((acc, t) => {
    const qs = questions.filter(q => q.topic_name === t.name)
    acc[t.name] = { total: t.total, solved: qs.filter(q => q.status === 'solved').length }
    return acc
  }, {}) ?? {}

  // Overall progress
  const totalSolved = questions.filter(q => q.status === 'solved').length
  const totalQ      = total || questions.length

  const clearFilters = () => { setTopic(''); setDiff(''); setLcOnly(false); setSearch(''); loadQuestions('') }
  const hasFilters   = activeTopic || activeDiff || lcOnly || search

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Problems</h1>
          <p className="text-[10px] font-mono text-muted mt-0.5">
            {loading ? '// LOADING...' : `// ${totalSolved}/${totalQ} SOLVED`}
          </p>
        </div>

        {/* Sheet switcher */}
        <div className="flex gap-2 flex-wrap">
          {sheetsLoading
            ? <div className="skeleton h-8 w-32 rounded-lg" />
            : sheets.map(s => (
                <button key={s.slug} onClick={() => { setSheet(s.slug); setTopic(''); setDiff('') }}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    activeSheet === s.slug
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-white/[0.07] text-muted hover:text-white hover:border-white/20'
                  )}>
                  {s.name.replace('DSA Sheet', '').trim()}
                </button>
              ))
          }
        </div>
      </div>

      {/* Overall progress bar */}
      {!loading && totalQ > 0 && (
        <div className="mb-5 fade-up-1">
          <div className="flex justify-between text-[10px] font-mono text-muted mb-1.5">
            <span>Overall Progress</span>
            <span className="text-accent2">{Math.round((totalSolved / totalQ) * 100)}%</span>
          </div>
          <div className="bg-white/[0.06] rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent2 rounded-full transition-all duration-700"
              style={{ width: `${(totalSolved / totalQ) * 100}%` }} />
          </div>
          <div className="flex gap-4 mt-2">
            {(['easy','medium','hard'] as const).map(d => {
              const dqs    = questions.filter(q => q.difficulty === d)
              const dsolved = dqs.filter(q => q.status === 'solved').length
              return (
                <div key={d} className="text-[10px] font-mono flex items-center gap-1.5">
                  <div className={clsx('w-1.5 h-1.5 rounded-full', diffColor[d].split(' ')[0].replace('text-', 'bg-'))} />
                  <span className={diffColor[d].split(' ')[0]}>{dsolved}/{dqs.length}</span>
                  <span className="text-muted capitalize">{d}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2 mb-4 fade-up-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input ref={searchRef} value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search problems..."
            className="w-full pl-8 pr-8 py-2 text-sm font-mono rounded-lg" />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button onClick={() => setShowFilters(v => !v)}
          className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
            (hasFilters || showFilters) ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-surface border-white/[0.07] text-muted hover:text-white')}>
          <SlidersHorizontal size={12} />
          Filters
          {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
        </button>

        {hasFilters && (
          <button onClick={clearFilters}
            className="px-3 py-2 rounded-lg text-xs font-mono text-muted border border-white/[0.07] hover:text-danger hover:border-danger/30 transition-all">
            Clear
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-surface border border-white/[0.07] rounded-xl fade-up">
          {/* Topic filter */}
          <div className="flex-1 min-w-[180px]">
            <div className="text-[9px] font-mono text-muted uppercase tracking-widest mb-1.5">Topic</div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setTopic('')}
                className={clsx('px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all',
                  !activeTopic ? 'bg-accent text-white border-accent' : 'text-muted border-white/[0.07] hover:text-white')}>
                All
              </button>
              {(currentSheet?.question_topics ?? []).map(t => (
                <button key={t.id} onClick={() => setTopic(activeTopic === t.id ? '' : t.id)}
                  className={clsx('px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all',
                    activeTopic === t.id ? 'bg-accent text-white border-accent' : 'text-muted border-white/[0.07] hover:text-white')}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty filter */}
          <div>
            <div className="text-[9px] font-mono text-muted uppercase tracking-widest mb-1.5">Difficulty</div>
            <div className="flex gap-1.5">
              {['', 'easy', 'medium', 'hard'].map(d => (
                <button key={d} onClick={() => setDiff(activeDiff === d ? '' : d)}
                  className={clsx('px-2.5 py-1 rounded-md text-[11px] font-mono border capitalize transition-all',
                    activeDiff === d
                      ? d ? `${diffColor[d]} border-current` : 'bg-accent text-white border-accent'
                      : 'text-muted border-white/[0.07] hover:text-white')}>
                  {d || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* LC only */}
          <div>
            <div className="text-[9px] font-mono text-muted uppercase tracking-widest mb-1.5">LeetCode</div>
            <button onClick={() => setLcOnly(v => !v)}
              className={clsx('px-3 py-1 rounded-md text-[11px] font-mono border transition-all',
                lcOnly ? 'bg-accent2/10 text-accent2 border-accent2/30' : 'text-muted border-white/[0.07] hover:text-white')}>
              LC link only
            </button>
          </div>
        </div>
      )}

      {/* Questions grouped by topic */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16">
          <Spinner size={20} />
          <span className="text-sm font-mono text-muted">Loading problems...</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="text-3xl">🔍</div>
          <p className="text-sm font-mono text-muted">No problems found</p>
          {hasFilters && <button onClick={clearFilters} className="text-xs font-mono text-accent hover:opacity-70">Clear filters →</button>}
        </div>
      ) : (
        <div className="space-y-3 fade-up-3">
          {topicOrder.map(topicName => {
            const qs       = byTopic[topicName] ?? []
            const solved   = qs.filter(q => q.status === 'solved').length
            const prog     = topicProgress[topicName] ?? { total: qs.length, solved }
            const pct      = prog.total > 0 ? Math.round((prog.solved / prog.total) * 100) : 0
            const collapsed = collapsedTopics[topicName]

            return (
              <div key={topicName} className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
                {/* Topic header */}
                <button
                  onClick={() => setCollapsed(p => ({ ...p, [topicName]: !p[topicName] }))}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold">{topicName}</span>
                      <span className="text-[10px] font-mono text-muted">{prog.solved}/{prog.total}</span>
                      {pct === 100 && <span className="text-[9px] font-mono text-accent2 bg-accent2/10 px-1.5 py-0.5 rounded">✓ Complete</span>}
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-1.5 bg-white/[0.06] rounded-full h-1 w-full max-w-[200px] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: pct === 100 ? '#5de0b0' : '#7c6af7' }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] font-mono text-accent2">{pct}%</span>
                    {collapsed ? <ChevronDown size={14} className="text-muted" /> : <ChevronUp size={14} className="text-muted" />}
                  </div>
                </button>

                {/* Questions list */}
                {!collapsed && (
                  <div className="divide-y divide-white/[0.04]">
                    {qs.map((q, i) => {
                      const sc    = statusConfig[q.status] ?? statusConfig.unsolved
                      const nextS = sc.next
                      const StatusIcon = sc.icon

                      return (
                        <div key={q.id}
                          className={clsx('flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors group',
                            q.status === 'solved' && 'opacity-70')}>

                          {/* Status toggle */}
                          <button onClick={() => updateStatus(q, nextS)} disabled={updatingId === q.id}
                            title={`Mark as ${nextS}`}
                            className={clsx('flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all',
                              q.status === 'unsolved'
                                ? 'border border-white/20 hover:border-accent2 hover:bg-accent2/10 text-transparent hover:text-accent2'
                                : `${sc.color} border border-current bg-current/10`)}>
                            {updatingId === q.id
                              ? <Spinner size={10} />
                              : StatusIcon
                                ? <StatusIcon size={11} />
                                : <span className="text-[10px] group-hover:block hidden">+</span>
                            }
                          </button>

                          {/* Index */}
                          <span className="text-[10px] font-mono text-muted w-5 flex-shrink-0 text-right">{i + 1}</span>

                          {/* Title */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className={clsx('text-sm truncate', q.status === 'solved' && 'line-through text-muted')}>
                              {q.title}
                            </span>
                            {q.leetcode_id && (
                              <span className="text-[9px] font-mono text-muted flex-shrink-0">#{q.leetcode_id}</span>
                            )}
                          </div>

                          {/* Difficulty badge */}
                          <span className={clsx('text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 hidden sm:inline-block', diffColor[q.difficulty])}>
                            {q.difficulty}
                          </span>

                          {/* LC link */}
                          {q.leetcode_url ? (
                            <a href={q.leetcode_url} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex-shrink-0 flex items-center gap-1 text-[10px] font-mono text-accent hover:text-white transition-colors px-2 py-1 rounded hover:bg-accent/10">
                              <ExternalLink size={11} />
                              <span className="hidden sm:inline">LC</span>
                            </a>
                          ) : (
                            <div className="flex-shrink-0 w-[44px] hidden sm:block" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-white/[0.05]">
        {Object.entries(statusConfig).filter(([k]) => k !== 'unsolved').map(([k, v]) => (
          <div key={k} className={clsx('flex items-center gap-1.5 text-[10px] font-mono', v.color)}>
            <v.icon size={11} />
            <span>{v.label}</span>
          </div>
        ))}
        <span className="text-[10px] font-mono text-muted ml-auto">Click circle to cycle status</span>
      </div>
    </AppShell>
  )
}
