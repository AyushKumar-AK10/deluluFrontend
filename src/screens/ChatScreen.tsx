import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { conversationApi, messageApi } from '@/services/api';
import type { AssistantResponse, Message } from '@/types';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ChevronLeft, Send, Loader2, AlertCircle } from 'lucide-react';

function parseAssistantResponse(response: string | AssistantResponse | Record<string, unknown> | undefined): { narration: string; suggestions: string[] } {
  const extractStructured = (value: unknown): Partial<AssistantResponse> | null => {
    if (!value || typeof value !== 'object') return null;

    const record = value as Record<string, unknown>;
    if ('narration' in record || 'suggested_actions' in record) {
      return record as Partial<AssistantResponse>;
    }
    if ('Response' in record && record.Response !== undefined) {
      return extractStructured(record.Response);
    }
    return null;
  };

  if (!response) return { narration: '', suggestions: [] };

  if (typeof response === 'string') {
    const trimmed = response.trim();
    if (!trimmed) return { narration: '', suggestions: [] };

    let candidate = trimmed
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(candidate) as unknown;
      const structured = extractStructured(parsed) ?? extractStructured(candidate);
      if (structured) {
        return {
          narration: typeof structured.narration === 'string' ? structured.narration : candidate,
          suggestions: Array.isArray(structured.suggested_actions)
            ? structured.suggested_actions.filter((item): item is string => typeof item === 'string')
            : [],
        };
      }

      return { narration: candidate, suggestions: [] };
    } catch {
      return { narration: candidate, suggestions: [] };
    }
  }

  const structured = extractStructured(response);
  if (structured) {
    return {
      narration: typeof structured.narration === 'string' ? structured.narration : '',
      suggestions: Array.isArray(structured.suggested_actions)
        ? structured.suggested_actions.filter((item): item is string => typeof item === 'string')
        : [],
    };
  }

  return { narration: '', suggestions: [] };
}

export function ChatScreen() {
  const { currentConversation, messages, setMessages, addMessage, navigate } = useAuth();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  useEffect(() => {
    if (!currentConversation) return;

    const isFreshConversation = currentConversation.createdAt && currentConversation.updatedAt
      && new Date(currentConversation.updatedAt).getTime() === new Date(currentConversation.createdAt).getTime();

    if (isFreshConversation) {
      return;
    }

    if (messages.some((m) => m.conversationId === currentConversation._id)) return;

    let cancelled = false;
    setLoadingHistory(true);
    conversationApi.fetchMessages(currentConversation._id)
      .then((history) => {
        if (cancelled) return;
        setMessages(history);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load conversation history';
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentConversation, messages, setMessages]);

  const submitMessage = async (content: string) => {
    if (!content || sending || !currentConversation) return;
    setSending(true); setError(null);

    const tempUserMsg: Message = {
      _id: `temp-${Date.now()}`,
      conversationId: currentConversation._id,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addMessage(tempUserMsg);
    setInput('');

    try {
      const response = await messageApi.chat(currentConversation._id, content);
      const parsedResponse = parseAssistantResponse(typeof response === 'string' ? response : response ?? undefined);
      const assistantMsg: Message = {
        _id: `res-${Date.now()}`,
        conversationId: currentConversation._id,
        role: 'assistant',
        content: parsedResponse.narration || (typeof response === 'string' ? response : ''),
        suggestions: parsedResponse.suggestions.length ? parsedResponse.suggestions : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMessage(assistantMsg);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setError(msg);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;
    await submitMessage(content);
  };

  const handleSuggestionClick = async (optionIndex: number) => {
    const optionText = `Selected Option ${optionIndex}`;
    await submitMessage(optionText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!currentConversation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink-900 px-6">
        <p className="text-ink-300 text-sm mb-4">No conversation selected.</p>
        <button onClick={() => navigate('home')} className="text-accent text-sm hover:text-accent-glow transition-colors">
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-ink-900 safe-top">
      <div className="flex-shrink-0 bg-ink-900/80 backdrop-blur-lg border-b border-ink-700/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('home')} className="p-2 -ml-2 text-ink-300 hover:text-ink-50 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-lg text-ink-50 truncate leading-tight">
            {currentConversation.title || 'Untitled Story'}
          </h1>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {loadingHistory && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <Loader2 className="h-5 w-5 text-accent animate-spin mb-3" />
              <p className="text-ink-300 text-sm text-center max-w-xs">Loading previous chat...</p>
            </div>
          )}

          {!loadingHistory && messages.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <button
                type="button"
                onClick={() => submitMessage('Begin Delulu')}
                className="rounded-full border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent shadow-lg shadow-accent/10 transition-all duration-200 hover:bg-accent/20 active:scale-95"
              >
                Begin Delulu
              </button>
            </div>
          )}

          {messages.map((msg) => (<MessageBubble key={msg._id} message={msg} onSuggestionClick={handleSuggestionClick} />))}

          {sending && (
            <div className="flex justify-start animate-fade-in">
              <div className="rounded-2xl rounded-bl-md bg-ink-800 border border-ink-600"><TypingIndicator /></div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-rose text-xs px-2 animate-fade-in">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 bg-ink-900/80 backdrop-blur-lg border-t border-ink-700/50 px-4 pt-3 pb-3 safe-bottom-input">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Continue the story..." rows={1} disabled={sending}
              className="w-full px-4 py-3 rounded-2xl bg-ink-800 border border-ink-600 text-ink-50 text-sm placeholder:text-ink-400 outline-none focus:border-accent/40 transition-colors resize-none disabled:opacity-50"
              style={{ maxHeight: '120px' }} />
          </div>
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="flex-shrink-0 h-11 w-11 flex items-center justify-center rounded-2xl bg-accent text-ink-900 transition-all duration-200 hover:bg-accent-glow active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, onSuggestionClick }: { message: Message; onSuggestionClick?: (optionIndex: number) => void }) {
  const isUser = message.role === 'user';
  const parsedAssistant = !isUser ? parseAssistantResponse(message.content) : null;
  const displayContent = parsedAssistant?.narration || message.content;
  const displaySuggestions = (message.suggestions && message.suggestions.length > 0)
    ? message.suggestions
    : (parsedAssistant?.suggestions ?? []);

  return (
    <div className={`flex animate-fade-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${
        isUser
          ? 'rounded-2xl rounded-br-md bg-accent/15 border border-accent/20 text-ink-50'
          : 'rounded-2xl rounded-bl-md bg-ink-800 border border-ink-600 text-ink-100'
      }`}>
        <div className="px-4 py-3 text-sm leading-relaxed">
          <p className="whitespace-pre-wrap break-words">{displayContent}</p>
        </div>

        {!isUser && displaySuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-ink-700/80 px-3 py-3">
            {displaySuggestions.map((suggestion, index) => (
              <button
                key={`${message._id}-suggestion-${index}`}
                type="button"
                onClick={() => onSuggestionClick?.(index + 1)}
                className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-[11px] font-medium text-accent hover:bg-accent/20 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
