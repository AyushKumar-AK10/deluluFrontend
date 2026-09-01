import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { conversationApi, messageApi } from '@/services/api';
import { GENRES, GENDERS, type DeluluFormData } from '@/types';
import { Slider } from '@/components/Slider';
import { ChevronLeft, Play, Loader2 } from 'lucide-react';

const INITIAL_FORM: DeluluFormData = {
  name: '', gender: '', age: '', genre: '', place: '', plot: '', tragicLevel: 5, dramaLevel: 5,
};

export function CreateScreen() {
  const { user, navigate, setCurrentConversation, setMessages } = useAuth();
  const [form, setForm] = useState<DeluluFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof DeluluFormData>(key: K, value: DeluluFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isValid = form.name.trim() && form.gender && form.age.trim() && form.genre && form.plot.trim();

  const buildContent = (data: DeluluFormData): string => [
    `Character Name: ${data.name}`, `Gender: ${data.gender}`, `Age: ${data.age}`,
    `Genre: ${data.genre}`,
    data.place?.trim() ? `Place: ${data.place.trim()}` : null,
    `Plot: ${data.plot}`,
    `Tragic Level: ${data.tragicLevel}/10`, `Drama Level: ${data.dramaLevel}/10`,
  ].filter(Boolean).join('\n');

  const buildTitle = (data: DeluluFormData): string => {
    const firstWord = data.plot.trim().split(/\s+/).slice(0, 4).join(' ');
    return `${data.name}'s ${data.genre}${firstWord ? ' — ' + firstWord + '...' : ''}`;
  };

  const handlePlay = async () => {
    if (!user || !isValid) return;
    setSubmitting(true); setError(null);
    try {
      const title = buildTitle(form);
      const content = buildContent(form);
      console.log('[create] starting story creation', {
        userId: user._id,
        title,
        content,
      });

      const newConversationId = await conversationApi.create(user._id, title);

      if (!newConversationId || !/^[0-9a-fA-F]{24}$/.test(newConversationId)) {
        console.error('[create] invalid conversation id returned from server', { newConversationId });
        throw new Error('Invalid conversation id returned from server');
      }

      console.log('[create] conversation created', {
        conversationId: newConversationId,
        userId: user._id,
        title,
        contentLength: content.length,
      });
      console.log('[create] calling messageApi.create with conversationId', newConversationId);

      const createdMessageId = await messageApi.create(newConversationId, 'user', content);
      console.log('[create] first message created', {
        conversationIdUsedForMessageRequest: newConversationId,
        createdMessageDocId: createdMessageId,
        note: 'messageId is different from conversationId by design; the message API should be called with the conversationId only.',
      });

      if (createdMessageId && !/^[0-9a-fA-F]{24}$/.test(createdMessageId)) {
        console.warn('[create] unexpected message id format', createdMessageId);
      }

      const newConversation = {
        _id: newConversationId, userId: user._id, title,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem('delulu_fresh_conversation', newConversationId);
      setCurrentConversation(newConversation);
      setMessages([]);
      setError(null);
      setForm(INITIAL_FORM);
      navigate('chat');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start your story';
      setError(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink-900 safe-top">
      <div className="sticky top-0 z-20 bg-ink-900/80 backdrop-blur-lg border-b border-ink-700/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('home')} className="p-2 -ml-2 text-ink-300 hover:text-ink-50 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-serif text-xl text-ink-50">Create Delulu</h1>
      </div>

      <div className="flex-1 px-6 py-6 pb-32 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-7">
          <Field label="Name" delay={0}>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
              placeholder="Your character's name" maxLength={50} className="delulu-input" />
          </Field>

          <Field label="Gender" delay={0.05}>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button key={g} type="button" onClick={() => update('gender', g)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                    form.gender === g
                      ? 'bg-accent text-ink-900 border border-accent'
                      : 'bg-ink-800 text-ink-200 border border-ink-600 hover:border-ink-500'
                  }`}>{g}</button>
              ))}
            </div>
          </Field>

          <Field label="Age" delay={0.1}>
            <input type="number" value={form.age} onChange={(e) => update('age', e.target.value)}
              placeholder="e.g. 25" min={1} max={150} className="delulu-input" />
          </Field>

          <Field label="Genre" delay={0.15}>
            <div className="relative">
              <select value={form.genre} onChange={(e) => update('genre', e.target.value)}
                className="delulu-input appearance-none pr-10 cursor-pointer">
                <option value="">Choose a genre...</option>
                {GENRES.map((g) => (<option key={g} value={g} className="bg-ink-800">{g}</option>))}
              </select>
              <ChevronLeft className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 rotate-[-90deg] pointer-events-none" />
            </div>
          </Field>

          <Field label="Place (optional)" delay={0.2}>
            <input type="text" value={form.place ?? ''} onChange={(e) => update('place', e.target.value)}
              placeholder="e.g. Paris, haunted mansion, moonlit forest" maxLength={80}
              className="delulu-input" />
          </Field>

          <Field label="Plot" delay={0.25}>
            <textarea value={form.plot} onChange={(e) => update('plot', e.target.value)}
              placeholder="Describe the scenario you want to experience..." rows={4} maxLength={1000}
              className="delulu-input resize-none leading-relaxed" />
            <p className="text-ink-400 text-[11px] mt-1.5 text-right">{form.plot.length}/1000</p>
          </Field>

          <div className="space-y-6 pt-2">
            <Slider label="Tragic Level" value={form.tragicLevel} onChange={(v) => update('tragicLevel', v)} accent="rose" />
            <Slider label="Drama Level" value={form.dramaLevel} onChange={(v) => update('dramaLevel', v)} accent="gold" />
          </div>

          {error && <p className="text-rose text-sm animate-fade-in py-2">{error}</p>}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-ink-900 via-ink-900/95 to-transparent pt-6 pb-6 px-6 safe-bottom">
        <div className="max-w-md mx-auto">
          <button onClick={handlePlay} disabled={!isValid || submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-accent text-ink-900 font-semibold text-base transition-all duration-200 hover:bg-accent-glow active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-accent/10">
            {submitting ? (<><Loader2 className="h-5 w-5 animate-spin" /> Weaving your story...</>)
              : (<><Play className="h-5 w-5 fill-current" /> Play</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, delay = 0 }: { label: string; children: React.ReactNode; delay?: number }) {
  return (
    <div className="space-y-2.5 animate-fade-up" style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}>
      <label className="block text-ink-200 text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
