import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, User, Zap } from 'lucide-react'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode]       = useState<Mode>('signin')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      })
      if (err) { setError(err.message); setLoading(false); return }
      setSent(true)
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">

      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent 70%)' }} />
      </div>

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4 z-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl blur-xl opacity-60"
            style={{ background: 'linear-gradient(135deg,#a855f7,#00d4ff)' }} />
          <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#a855f7,#00d4ff)' }}>
            <Zap className="w-10 h-10 text-slate-900" strokeWidth={2.5} />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight">
            <span style={{ background: 'linear-gradient(135deg,#a855f7,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Metabo</span>
            <span className="text-white">.ai</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#71717a' }}>Metabolism Intelligence · AI-driven body adaptation</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm z-10 rounded-3xl p-6 space-y-5"
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 60px rgba(168,85,247,0.15), 0 25px 50px rgba(0,0,0,0.3)'
        }}>

        {/* Tab switcher */}
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['signin', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setSent(false) }}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
              style={mode === m ? {
                background: 'linear-gradient(135deg,rgba(168,85,247,0.82),rgba(0,212,255,0.68))',
                color: 'white',
                border: '1px solid rgba(168,85,247,0.45)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(168,85,247,0.25)',
              } : { color: 'rgba(255,255,255,0.4)' }}
            >
              {m === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        {sent ? (
          <div className="text-center py-6 space-y-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
              <Mail className="w-5 h-5" style={{ color: '#a855f7' }} />
            </div>
            <p className="font-semibold text-white">Check your email</p>
            <p className="text-sm" style={{ color: '#71717a' }}>
              We sent a link to <span className="text-white">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#71717a' }} />
                <input
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#00d4ff'}
                  onBlur={e => e.currentTarget.style.borderColor = '#1e1f35'}
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#71717a' }} />
              <input
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.12)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#71717a' }} />
              <input
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.12)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPass(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3.5 py-3 rounded-2xl text-sm"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-200 mt-1 disabled:opacity-50"
              style={{
                background: loading ? 'rgba(168,85,247,0.6)' : 'linear-gradient(135deg,rgba(168,85,247,0.85),rgba(0,212,255,0.72))',
                border: '1px solid rgba(168,85,247,0.45)',
                boxShadow: loading ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : '0 4px 20px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.22)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
                  Please wait…
                </span>
              ) : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        )}

        {mode === 'signin' && !sent && (
          <p className="text-center text-xs" style={{ color: '#71717a' }}>
            <button
              className="hover:text-white transition-colors"
              style={{ color: '#00d4ff' }}
              onClick={async () => {
                if (!email) { setError('Enter your email first'); return }
                setError(''); setLoading(true)
                const { error: err } = await supabase.auth.resetPasswordForEmail(email)
                if (err) setError(err.message)
                else setSent(true)
                setLoading(false)
              }}
            >
              Forgot password?
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
