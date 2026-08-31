import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { useState, useEffect } from 'react';

export function LoginScreen() {
  const { loginWithGoogle, loading, setUserEmail, error, clearError } = useAuth();
  const [showEmailEntry, setShowEmailEntry] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { clearError(); }, [clearError]);

  const handleGoogleLogin = () => { loginWithGoogle(); };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try { await setUserEmail(email.trim()); }
    catch { /* error set in context */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden bg-ink-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-accent/8 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-rose/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full animate-fade-in-slow">
        <div className="mb-8 animate-pulse-soft"><Logo size="lg" /></div>
        <h1 className="font-serif text-5xl text-ink-50 tracking-tight mb-3">Delulu</h1>
        <p className="text-ink-300 text-sm leading-relaxed mb-12 max-w-xs text-balance">
          Step into worlds crafted by AI. Live stories that bend to your imagination.
        </p>

        {!showEmailEntry ? (
          <div className="w-full flex flex-col items-center gap-4">
            <button onClick={handleGoogleLogin} disabled={loading}
              className="w-full max-w-xs flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-ink-50 text-ink-900 font-medium text-sm transition-all duration-200 hover:bg-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ink-950/50">
              <GoogleIcon /> Continue with Google
            </button>
            <button onClick={() => setShowEmailEntry(true)}
              className="text-ink-400 text-xs hover:text-ink-200 transition-colors mt-2">
              Already logged in? Enter email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="w-full max-w-xs flex flex-col gap-3 animate-fade-up">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" autoFocus
              className="w-full px-4 py-3.5 rounded-2xl bg-ink-800 border border-ink-600 text-ink-50 text-sm placeholder:text-ink-400 outline-none focus:border-accent/50 transition-colors" />
            <button type="submit" disabled={submitting || !email.trim()}
              className="w-full px-6 py-3.5 rounded-2xl bg-accent text-ink-900 font-medium text-sm transition-all duration-200 hover:bg-accent-glow active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? 'Connecting...' : 'Continue'}
            </button>
            <button type="button" onClick={() => setShowEmailEntry(false)}
              className="text-ink-400 text-xs hover:text-ink-200 transition-colors mt-1">Back</button>
          </form>
        )}

        {error && <p className="mt-4 text-rose text-xs animate-fade-in">{error}</p>}
      </div>

      <p className="absolute bottom-6 text-ink-400 text-[11px] tracking-wide safe-bottom">Your story awaits</p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
