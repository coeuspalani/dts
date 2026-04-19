'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, Trophy, Settings, LogOut, Zap } from 'lucide-react'
import clsx from 'clsx'

export default function Sidebar() {
  const pathname     = usePathname()
  const router       = useRouter()
  const { user, logout } = useAuth()

  const nav = [
    { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
    { href: '/leaderboard',label: 'Leaderboard',icon: Trophy },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: Settings }] : []),
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-white/[0.07] flex flex-col py-6 h-screen sticky top-0">
      <div className="px-5 mb-8">
        <div className="text-2xl font-black tracking-tight">
          D<span className="text-accent">T</span>S
        </div>
        <div className="text-[10px] font-mono text-muted tracking-widest mt-0.5">// DARE TO SOLVE</div>
      </div>

      <nav className="flex-1 px-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <button key={href} onClick={() => router.push(href)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all text-left',
              pathname === href
                ? 'text-accent bg-accent/10 border-l-2 border-accent rounded-l-none'
                : 'text-muted hover:text-white hover:bg-white/[0.03]'
            )}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-4 pt-4 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.name}</div>
            <div className="text-[10px] font-mono text-muted">{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="text-muted hover:text-danger transition-colors p-1" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
