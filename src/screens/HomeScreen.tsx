import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Sparkles, BookOpen, LogOut, X } from 'lucide-react';

export function HomeScreen() {
  const { user, navigate, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink-900 px-6 pt-16 pb-10 safe-top safe-bottom">
      <div className="flex items-center justify-between mb-12 animate-fade-in">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="font-serif text-xl text-ink-50">Delulu</span>
        </div>
        <button type="button" onClick={handleLogoutClick} className="p-0 bg-transparent border-0 focus:outline-none">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="h-9 w-9 rounded-full border border-ink-600 object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-ink-700 flex items-center justify-center text-ink-200 text-xs font-medium">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </button>
      </div>

      <div className="mb-10 animate-fade-up">
        <h1 className="font-serif text-3xl text-ink-50 leading-tight mb-2">
          Welcome back,<br />
          <span className="text-accent">{user?.name?.split(' ')[0] || 'Dreamer'}</span>
        </h1>
        <p className="text-ink-300 text-sm">What story shall we weave today?</p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <button onClick={() => navigate('create')}
          className="group relative overflow-hidden rounded-3xl bg-ink-800 border border-ink-600 p-6 text-left transition-all duration-300 hover:border-accent/30 active:scale-[0.98] animate-fade-up"
          style={{ animationDelay: '0.1s' }}>
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-accent/8 blur-[50px] transition-opacity duration-300 group-hover:bg-accent/15" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-2xl text-ink-50 mb-1">Create Delulu</h2>
              <p className="text-ink-300 text-sm leading-relaxed">Craft a new world. Choose your genre, set the drama, and begin a fresh story.</p>
            </div>
          </div>
        </button>

        <button onClick={() => navigate('resume')}
          className="group relative overflow-hidden rounded-3xl bg-ink-800 border border-ink-600 p-6 text-left transition-all duration-300 hover:border-rose/30 active:scale-[0.98] animate-fade-up"
          style={{ animationDelay: '0.2s' }}>
          <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-rose/8 blur-[50px] transition-opacity duration-300 group-hover:bg-rose/15" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-rose/10 border border-rose/20 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-rose" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-2xl text-ink-50 mb-1">Resume Delulu</h2>
              <p className="text-ink-300 text-sm leading-relaxed">Return to a story in progress. Pick up where you left off.</p>
            </div>
          </div>
        </button>
      </div>

      <div className="pt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <button onClick={handleLogoutClick} className="flex items-center gap-2 text-ink-400 text-xs hover:text-ink-200 transition-colors">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-ink-600 bg-ink-800 p-5 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-ink-50">Confirm logout</h3>
              <button type="button" onClick={() => setShowLogoutConfirm(false)} className="p-1 text-ink-400 hover:text-ink-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-ink-300 leading-relaxed mb-5">Are you sure you want to sign out? You’ll need to log in again to continue your stories.</p>

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-2xl border border-ink-600 bg-ink-700 px-4 py-2.5 text-sm font-medium text-ink-200 transition-colors hover:border-ink-500 hover:text-ink-50">
                Cancel
              </button>
              <button type="button" onClick={confirmLogout} className="flex-1 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-400">
                Yes, logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
