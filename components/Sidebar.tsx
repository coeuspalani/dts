'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, Trophy, Settings, LogOut, Menu, X, Zap } from 'lucide-react'
import clsx from 'clsx'

export default function Sidebar() {
  const pathname        = usePathname()
  const router          = useRouter()
  const { user, logout} = useAuth()
  const [open, setOpen] = useState(false)

  const nav = [
    { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
    { href: '/challenges', label: 'Challenges', icon: Zap },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: Settings }] : []),
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 mb-8 flex items-center justify-between">
        <div>
          <div className="text-xl font-black tracking-tight">D<span className="text-accent">T</span>S</div>
          <div className="text-[9px] font-mono text-muted tracking-widest">// DARE TO SOLVE</div>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden text-muted hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <button key={href}
              onClick={() => { router.push(href); setOpen(false) }}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                active
                  ? 'text-accent bg-accent/10 border-l-2 border-accent rounded-l-none pl-[10px]'
                  : 'text-muted hover:text-white hover:bg-white/[0.04] border-l-2 border-transparent'
              )}>
              <Icon size={15} className="flex-shrink-0" />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent pulse-dot" />}
            </button>
          )
        })}
      </nav>

      {/* User chip */}
      <div className="px-4 pt-4 mt-auto border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.name}</div>
            <div className="flex items-center gap-1.5">
              <div className={clsx('w-1.5 h-1.5 rounded-full', user?.role === 'admin' ? 'bg-gold' : 'bg-accent2')} />
              <span className="text-[10px] font-mono text-muted">{user?.role}</span>
            </div>
          </div>
          <button onClick={handleLogout} title="Logout"
            className="text-muted hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-danger/10">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-bg/90 backdrop-blur border-b border-white/[0.07] flex items-center justify-between px-4 h-14">
        <div className="text-lg font-black">D<span className="text-accent">T</span>S</div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-muted truncate max-w-[120px]">{user?.name}</div>
          <button onClick={() => setOpen(true)} className="text-muted hover:text-white transition-colors p-1">
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-64 bg-surface border-r border-white/[0.07] flex flex-col py-6 h-full fade-up">
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] flex-shrink-0 bg-surface border-r border-white/[0.07] flex-col py-6 h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile top bar spacer */}
      <div className="md:hidden h-14 flex-shrink-0" />
    </>
  )
}
