import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { conversationApi } from '@/services/api';
import type { Conversation } from '@/types';
import { ChevronLeft, Play, Loader2, BookOpen, Clock } from 'lucide-react';

export function ResumeScreen() {
  const { user, navigate, setCurrentConversation, setMessages, refreshConversations, conversations } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    refreshConversations().finally(() => setLoading(false));
  }, [user, refreshConversations]);

  const handleResume = async (conv: Conversation) => {
    setResumingId(conv._id); setError(null);
    try {
      const msgs = await conversationApi.fetchMessages(conv._id);
      setCurrentConversation(conv);
      setMessages(msgs);
      navigate('chat');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(msg);
    } finally { setResumingId(null); }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink-900 safe-top">
      <div className="sticky top-0 z-20 bg-ink-900/80 backdrop-blur-lg border-b border-ink-700/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('home')} className="p-2 -ml-2 text-ink-300 hover:text-ink-50 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-serif text-xl text-ink-50">Resume Delulu</h1>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-accent animate-spin mb-4" />
              <p className="text-ink-300 text-sm">Loading your stories...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-rose text-sm mb-4">{error}</p>
              <button onClick={() => { setError(null); setLoading(true); refreshConversations().finally(() => setLoading(false)); }}
                className="text-accent text-sm hover:text-accent-glow transition-colors">Try again</button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="h-16 w-16 rounded-3xl bg-ink-800 border border-ink-600 flex items-center justify-center mb-5">
                <BookOpen className="h-8 w-8 text-ink-400" />
              </div>
              <h2 className="font-serif text-xl text-ink-100 mb-2">No stories yet</h2>
              <p className="text-ink-300 text-sm text-center mb-6 max-w-xs">
                You haven't started any stories. Create a new Delulu to begin your journey.
              </p>
              <button onClick={() => navigate('create')}
                className="px-6 py-3 rounded-2xl bg-accent text-ink-900 font-medium text-sm transition-all hover:bg-accent-glow active:scale-95">
                Create Delulu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-ink-400 text-xs uppercase tracking-wider mb-4 px-1">
                {conversations.length} {conversations.length === 1 ? 'story' : 'stories'}
              </p>
              {conversations.map((conv, i) => (
                <div key={conv._id}
                  className="group relative rounded-2xl bg-ink-800 border border-ink-600 p-4 transition-all duration-300 hover:border-accent/20 animate-fade-up"
                  style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-lg text-ink-50 leading-snug truncate">{conv.title || 'Untitled Story'}</h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="h-3 w-3 text-ink-400" />
                        <span className="text-ink-400 text-xs">{formatDate(conv.createdAt || conv.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleResume(conv)} disabled={resumingId === conv._id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ink-700 text-ink-50 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-ink-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                    {resumingId === conv._id ? (<><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>)
                      : (<><Play className="h-4 w-4 fill-current" /> Resume</>)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
