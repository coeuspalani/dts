'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Spinner from '@/components/Spinner'
import { PageLoader } from '@/components/Spinner'
import OTPInput from '@/components/OTPInput'
import { sendOTP, verifyOTP, resetPassword, loginUser, registerUser } from '@/lib/api-client-auth'
import { ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react'

type Mode = 'login' | 'register' | 'verify_email' | 'forgot_password' | 'verify_reset' | 'new_password'

interface LiveEntry { rank: number; name: string; points: number }

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, login, register } = useAuth()

  // ── ALL hooks before any conditional returns ──────────────────────────
  const [mode, setMode]           = useState<Mode>('login')
  const [submitting, setSubmit]   = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [otpCode, setOtpCode]     = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [liveData, setLiveData]   = useState<{ entries: LiveEntry[]; challenge: string; daysLeft: string } | null>(null)
  const [form, setForm]           = useState({
    name: '', email: '', password: '', confirmPassword: '',
    leetcode_username: '', newPassword: '', confirmNewPassword: '',
  })

  // Redirect if logged in
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  // Live leaderboard
  useEffect(() => {
    fetch('/api/leaderboard?limit=5').then(r => r.json()).then(d => {
      const entries = (d.data?.entries ?? []).map((e: any) => ({ rank: e.rank, name: e.name, points: e.points }))
      setLiveData(prev => ({ ...prev ?? { challenge: '', daysLeft: '' }, entries }))
    }).catch(() => {})
    fetch('/api/challenges?status=active').then(r => r.json()).then(d => {
      const c = d.data?.[0]
      if (c) {
        const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000)
        setLiveData(prev => ({ ...prev ?? { entries: [] }, challenge: c.title, daysLeft: days > 0 ? `${days}d left` : 'Ending today' }))
      }
    }).catch(() => {})
  }, [])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const clearErrors = () => { setError(''); setSuccess('') }

  const goMode = (m: Mode) => { setMode(m); clearErrors(); setOtpCode(''); setOtpVerified(false) }

  // ── LOGIN ─────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clearErrors(); setSubmit(true)
    try {
      if (!form.email.trim()) throw new Error('Email is required')
      if (!form.password)     throw new Error('Password is required')
      await login(form.email.trim(), form.password)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Login failed — please try again')
    } finally { setSubmit(false) }
  }

  // ── REGISTER — Step 1: send OTP ───────────────────────────────────────
  const handleSendRegisterOTP = async (e: React.FormEvent) => {
    e.preventDefault(); clearErrors(); setSubmit(true)
    try {
      if (!form.name.trim())             throw new Error('Full name is required')
      if (!form.email.trim())            throw new Error('Email is required')
      if (!form.password)                throw new Error('Password is required')
      if (form.password.length < 6)     throw new Error('Password must be at least 6 characters')
      if (form.password !== form.confirmPassword) throw new Error('Passwords do not match')
      if (!form.leetcode_username.trim())throw new Error('LeetCode username is required')

      const res = await sendOTP(form.email.trim(), 'verify_email', form.name.trim())
      if (!res.success) throw new Error(res.error ?? 'Failed to send code')

      setCountdown(60)
      goMode('verify_email')
      setSuccess(`Verification code sent to ${form.email}`)
    } catch (err: any) {
      setError(err.message)
    } finally { setSubmit(false) }
  }

  // ── REGISTER — Step 2: verify OTP + create account ───────────────────
  const handleVerifyAndRegister = async () => {
    if (otpCode.length !== 6) { setError('Enter all 6 digits'); return }
    clearErrors(); setSubmit(true)
    try {
      // Verify OTP
      const vRes = await verifyOTP(form.email.trim(), otpCode, 'verify_email')
      if (!vRes.success) throw new Error(vRes.error ?? 'Invalid code')

      // Create account
      await register({
        name:              form.name.trim(),
        email:             form.email.trim(),
        password:          form.password,
        leetcode_username: form.leetcode_username.trim(),
        otp_verified:      true,
      })
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Registration failed')
      if (err.message?.toLowerCase().includes('code')) setOtpCode('')
    } finally { setSubmit(false) }
  }

  // ── FORGOT — Step 1: send reset OTP ──────────────────────────────────
  const handleSendResetOTP = async (e: React.FormEvent) => {
    e.preventDefault(); clearErrors(); setSubmit(true)
    try {
      if (!form.email.trim()) throw new Error('Email is required')
      const res = await sendOTP(form.email.trim(), 'reset_password')
      if (!res.success) throw new Error(res.error ?? 'Failed to send code')
      setCountdown(60)
      goMode('verify_reset')
      setSuccess(`Reset code sent to ${form.email} (check spam too)`)
    } catch (err: any) { setError(err.message) }
    finally { setSubmit(false) }
  }

  // ── FORGOT — Step 2: verify reset OTP ────────────────────────────────
  const handleVerifyReset = async () => {
    if (otpCode.length !== 6) { setError('Enter all 6 digits'); return }
    clearErrors(); setSubmit(true)
    try {
      const res = await verifyOTP(form.email.trim(), otpCode, 'reset_password')
      if (!res.success) throw new Error(res.error ?? 'Invalid code')
      setOtpVerified(true)
      goMode('new_password')
    } catch (err: any) {
      setError(err.message)
      setOtpCode('')
    } finally { setSubmit(false) }
  }

  // ── FORGOT — Step 3: set new password ────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); clearErrors(); setSubmit(true)
    try {
      if (!form.newPassword)                            throw new Error('New password is required')
      if (form.newPassword.length < 6)                 throw new Error('Password must be at least 6 characters')
      if (form.newPassword !== form.confirmNewPassword) throw new Error('Passwords do not match')
      await resetPassword(form.email.trim(), otpCode, form.newPassword)
      setSuccess('Password updated! Logging you in...')
      setTimeout(() => goMode('login'), 1500)
    } catch (err: any) { setError(err.message) }
    finally { setSubmit(false) }
  }

  const handleResendOTP = async () => {
    if (countdown > 0 || resending) return
    setResending(true); clearErrors()
    try {
      const purpose = mode === 'verify_email' ? 'verify_email' : 'reset_password'
      const res     = await sendOTP(form.email.trim(), purpose, form.name.trim())
      if (!res.success) throw new Error(res.error)
      setCountdown(60); setOtpCode('')
      setSuccess('New code sent!')
    } catch (err: any) { setError(err.message) }
    finally { setResending(false) }
  }

  // ── Conditional renders AFTER all hooks ──────────────────────────────
  if (loading) return <PageLoader label="Checking session..." />
  if (user)    return null

  // ── Shared UI pieces ──────────────────────────────────────────────────
  const ErrorMsg = () => error ? (
    <div className="flex items-start gap-2 px-4 py-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger font-mono fade-up">
      <span className="flex-shrink-0 mt-0.5">✕</span>{error}
    </div>
  ) : null

  const SuccessMsg = () => success ? (
    <div className="flex items-start gap-2 px-4 py-3 bg-accent2/10 border border-accent2/20 rounded-xl text-sm text-accent2 font-mono fade-up">
      <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />{success}
    </div>
  ) : null

  const SubmitBtn = ({ label, loadingLabel }: { label: string; loadingLabel?: string }) => (
    <button type="submit" disabled={submitting}
      className="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:opacity-85 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20">
      {submitting ? <><Spinner size={16} color="#fff" />{loadingLabel ?? 'Please wait...'}</> : label}
    </button>
  )

  const Field = ({ label, type = 'text', field, placeholder, hint }: {
    label: string; type?: string; field: keyof typeof form; placeholder?: string; hint?: string
  }) => (
    <div>
      <label className="block text-[10px] font-mono text-muted uppercase tracking-widest mb-1.5">{label}</label>
      <input type={type} value={form[field]} onChange={set(field)} placeholder={placeholder}
        className="w-full px-4 py-3 text-sm font-mono rounded-lg" required />
      {hint && <p className="text-[10px] font-mono text-muted mt-1.5">{hint}</p>}
    </div>
  )

  const BackBtn = ({ to }: { to: Mode }) => (
    <button type="button" onClick={() => goMode(to)}
      className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-white transition-colors mb-6">
      <ArrowLeft size={12} /> Back
    </button>
  )

  const ResendRow = () => (
    <div className="text-center">
      <button type="button" onClick={handleResendOTP} disabled={countdown > 0 || resending}
        className="text-xs font-mono text-muted hover:text-accent transition-colors disabled:opacity-50 flex items-center gap-1.5 mx-auto">
        {resending ? <Spinner size={11} /> : <RefreshCw size={11} />}
        {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
      </button>
    </div>
  )

  // ── Form content by mode ──────────────────────────────────────────────
  const renderForm = () => {
    switch (mode) {

      // LOGIN
      case 'login': return (
        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Email" type="email" field="email" placeholder="you@example.com" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono text-muted uppercase tracking-widest">Password</label>
              <button type="button" onClick={() => goMode('forgot_password')}
                className="text-[10px] font-mono text-accent hover:opacity-70 transition-opacity">
                Forgot password?
              </button>
            </div>
            <input type="password" value={form.password} onChange={set('password')}
              placeholder="••••••••" className="w-full px-4 py-3 text-sm font-mono rounded-lg" required />
          </div>
          <ErrorMsg />
          <SubmitBtn label="Enter the Arena →" loadingLabel="Signing in..." />
          <p className="text-center text-xs font-mono text-muted">
            No account?{' '}
            <button type="button" onClick={() => goMode('register')} className="text-accent hover:opacity-70">
              Register
            </button>
          </p>
        </form>
      )

      // REGISTER — step 1
      case 'register': return (
        <form onSubmit={handleSendRegisterOTP} className="space-y-4">
          <Field label="Full Name" field="name" placeholder="Palani Kumar" />
          <Field label="Email" type="email" field="email" placeholder="you@example.com" />
          <Field label="Password" type="password" field="password" placeholder="Min 6 characters" />
          <Field label="Confirm Password" type="password" field="confirmPassword" placeholder="Repeat password" />
          <Field label="LeetCode Username" field="leetcode_username" placeholder="your_lc_username"
            hint="We'll verify this + fetch your stats from LeetCode" />
          <ErrorMsg />
          <SubmitBtn label="Send Verification Code →" loadingLabel="Sending code..." />
          <p className="text-center text-xs font-mono text-muted">
            Already registered?{' '}
            <button type="button" onClick={() => goMode('login')} className="text-accent hover:opacity-70">Login</button>
          </p>
        </form>
      )

      // REGISTER — step 2: verify email OTP
      case 'verify_email': return (
        <div className="space-y-6">
          <BackBtn to="register" />
          <div className="text-center">
            <div className="text-2xl mb-2">📬</div>
            <p className="text-sm text-muted font-mono">Code sent to</p>
            <p className="text-sm font-semibold text-white">{form.email}</p>
          </div>
          <SuccessMsg />
          <OTPInput value={otpCode} onChange={setOtpCode} disabled={submitting} />
          <ErrorMsg />
          <button onClick={handleVerifyAndRegister} disabled={submitting || otpCode.length !== 6}
            className="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:opacity-85 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Spinner size={16} color="#fff" />Creating account...</> : 'Verify & Create Account →'}
          </button>
          <ResendRow />
        </div>
      )

      // FORGOT — step 1: enter email
      case 'forgot_password': return (
        <form onSubmit={handleSendResetOTP} className="space-y-4">
          <BackBtn to="login" />
          <div className="text-center mb-2">
            <div className="text-2xl mb-2">🔐</div>
            <p className="text-sm text-muted">Enter your email and we&apos;ll send a reset code</p>
          </div>
          <Field label="Email" type="email" field="email" placeholder="you@example.com" />
          <ErrorMsg />
          <SubmitBtn label="Send Reset Code →" loadingLabel="Sending..." />
        </form>
      )

      // FORGOT — step 2: verify reset OTP
      case 'verify_reset': return (
        <div className="space-y-6">
          <BackBtn to="forgot_password" />
          <div className="text-center">
            <div className="text-2xl mb-2">🔑</div>
            <p className="text-sm text-muted font-mono">Reset code sent to</p>
            <p className="text-sm font-semibold text-white">{form.email}</p>
          </div>
          <SuccessMsg />
          <OTPInput value={otpCode} onChange={setOtpCode} disabled={submitting} />
          <ErrorMsg />
          <button onClick={handleVerifyReset} disabled={submitting || otpCode.length !== 6}
            className="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:opacity-85 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Spinner size={16} color="#fff" />Verifying...</> : 'Verify Code →'}
          </button>
          <ResendRow />
        </div>
      )

      // FORGOT — step 3: new password
      case 'new_password': return (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="text-center mb-2">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-sm text-muted">Code verified! Set your new password.</p>
          </div>
          <Field label="New Password" type="password" field="newPassword" placeholder="Min 6 characters" />
          <Field label="Confirm New Password" type="password" field="confirmNewPassword" placeholder="Repeat password" />
          <SuccessMsg />
          <ErrorMsg />
          <SubmitBtn label="Update Password →" loadingLabel="Updating..." />
        </form>
      )
    }
  }

  const modeTitle: Record<Mode, string> = {
    login:            'Welcome back',
    register:         'Join DTS',
    verify_email:     'Verify Email',
    forgot_password:  'Reset Password',
    verify_reset:     'Enter Reset Code',
    new_password:     'New Password',
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col lg:flex-row">
      {/* ── Left: form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-10 lg:max-w-md w-full mx-auto lg:mx-0">
        <div className="mb-8">
          <div className="text-4xl sm:text-5xl font-black tracking-tight mb-1">
            D<span className="text-accent">T</span>S
          </div>
          <div className="text-[11px] font-mono text-muted tracking-widest">// DARE TO SOLVE</div>
        </div>

        {/* Tab toggle for login/register only */}
        {(mode === 'login' || mode === 'register') && (
          <div className="flex gap-2 mb-6 bg-surface2 p-1 rounded-xl">
            {(['login','register'] as Mode[]).map(m => (
              <button key={m} onClick={() => goMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg capitalize transition-all
                  ${mode === m ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Mode title for other screens */}
        {!['login','register'].includes(mode) && (
          <h2 className="text-xl font-black mb-6">{modeTitle[mode]}</h2>
        )}

        {renderForm()}

        {/* Mobile leaderboard preview */}
        {liveData?.entries?.length > 0 && (mode === 'login' || mode === 'register') && (
          <div className="lg:hidden mt-8 pt-6 border-t border-white/[0.07]">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              // live leaderboard <div className="w-1.5 h-1.5 rounded-full bg-accent2 pulse-dot" />
            </div>
            {liveData.entries.slice(0,3).map(({ rank, name, points }) => (
              <div key={rank} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 mb-2">
                <span className={`font-mono text-xs font-bold w-4 ${rank===1?'text-gold':'text-muted'}`}>{rank}</span>
                <span className="flex-1 text-sm font-semibold truncate">{name}</span>
                <span className="text-xs font-mono text-accent2">{points}pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: live leaderboard (desktop) ── */}
      <div className="hidden lg:flex flex-1 bg-surface border-l border-white/[0.07] flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent2/5 blur-3xl pointer-events-none" />
        <div className="w-full max-w-xs relative">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest">// live leaderboard</div>
            {liveData && <div className="w-1.5 h-1.5 rounded-full bg-accent2 pulse-dot" />}
          </div>
          {liveData
            ? liveData.entries.length > 0
              ? liveData.entries.map(({ rank, name, points }) => (
                  <div key={rank} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 mb-2 fade-up">
                    <span className={`font-mono text-xs font-bold w-4 ${rank===1?'text-gold':'text-muted'}`}>{rank}</span>
                    <span className="flex-1 text-sm font-semibold truncate">{name}</span>
                    <span className="text-xs font-mono text-accent2">{points}pts</span>
                  </div>
                ))
              : <p className="text-sm font-mono text-muted text-center py-8">Be the first to join!</p>
            : [1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-3 mb-2">
                  <div className="skeleton h-3 w-4" /><div className="skeleton h-3 flex-1" /><div className="skeleton h-3 w-12" />
                </div>
              ))
          }
          {liveData?.challenge && (
            <div className="mt-5 bg-accent/5 border border-accent/15 rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono text-muted mb-1">current challenge</div>
              <div className="text-sm font-bold text-accent">{liveData.challenge}</div>
              {liveData.daysLeft && <div className="text-[10px] font-mono text-muted mt-1">{liveData.daysLeft}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
