import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { conversationApi, messageApi } from '@/services/api';
import type { AssistantResponse, Message } from '@/types';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ChevronLeft, Send, Loader2, AlertCircle } from 'lucide-react';

function parseAssistantResponse(response: string | AssistantResponse | Record<string, unknown> | undefined): {
  narration: string;
  dialogue: Array<{ character: string; text: string }>;
  suggestions: string[];
  newInformation: string[];
  sceneStatus: string;
} {
  const normalizeDialogue = (value: unknown): Array<{ character: string; text: string }> => {
    const splitCharacterText = (raw: string): { character: string; text: string } | null => {
      const trimmed = raw.trim();
      if (!trimmed) return null;

      const match = trimmed.match(/^([^:]+?)\s*:\s*(.+)$/);
      if (!match) return null;

      const firstSegment = match[1].trim();
      const remainder = match[2].trim();
      if (!firstSegment || !remainder) return null;

      if (/^narrator$/i.test(firstSegment)) {
        const nested = splitCharacterText(remainder);
        if (nested) return nested;
      }

      const nestedMatch = remainder.match(/^([^:]+?)\s*:\s*(.+)$/);
      if (nestedMatch && !/^narrator$/i.test(firstSegment)) {
        const nestedCharacter = nestedMatch[1].trim();
        const nestedText = nestedMatch[2].trim();
        if (nestedCharacter && nestedText) {
          return { character: nestedCharacter, text: nestedText };
        }
      }

      return { character: firstSegment, text: remainder };
    };

    const extractDialogueEntry = (record: Record<string, unknown>): { character: string; text: string } | null => {
      const candidateCharacter = typeof record.character === 'string'
        ? record.character
        : typeof record.Character === 'string'
          ? record.Character
          : typeof record.name === 'string'
            ? record.name
            : typeof record.Name === 'string'
              ? record.Name
              : typeof record.speaker === 'string'
                ? record.speaker
                : typeof record.Speaker === 'string'
                  ? record.Speaker
                  : typeof record.characterName === 'string'
                    ? record.characterName
                    : typeof record.CharacterName === 'string'
                      ? record.CharacterName
                      : typeof record.narrator === 'string'
                        ? record.narrator
                        : typeof record.Narrator === 'string'
                          ? record.Narrator
                          : '';

      const candidateText = typeof record.text === 'string'
        ? record.text
        : typeof record.Text === 'string'
          ? record.Text
          : typeof record.dialogue === 'string'
            ? record.dialogue
            : typeof record.Dialogue === 'string'
              ? record.Dialogue
              : typeof record.speech === 'string'
                ? record.speech
                : typeof record.Speech === 'string'
                  ? record.Speech
                  : typeof record.value === 'string'
                    ? record.value
                    : typeof record.Value === 'string'
                      ? record.Value
                      : '';

      if (!candidateText.trim()) return null;

      const textSplit = splitCharacterText(candidateText);
      if (/^narrator$/i.test(candidateCharacter.trim()) && textSplit) {
        return textSplit;
      }

      if (candidateCharacter.trim()) {
        return { character: candidateCharacter.trim(), text: candidateText.trim() };
      }

      if (textSplit) return textSplit;

      return { character: 'Narrator', text: candidateText.trim() };
    };

    const collectFromObject = (obj: Record<string, unknown>): Array<{ character: string; text: string }> => {
      const lines: Array<{ character: string; text: string }> = [];

      const directEntry = extractDialogueEntry(obj);
      if (directEntry) return [directEntry];

      for (const [key, entry] of Object.entries(obj)) {
        if (['narration', 'Narration', 'description', 'Description', 'scene_status', 'sceneStatus', 'new_information', 'newInformation', 'newInfo', 'suggested_actions', 'suggestedActions'].includes(key)) {
          continue;
        }

        if (typeof entry === 'string') {
          const split = splitCharacterText(entry);
          const fallback = entry.trim();
          if (split) {
            lines.push(split);
          } else if (fallback && !['Narrator', 'Narration', 'Scene'].includes(key)) {
            lines.push({ character: key, text: fallback });
          }
          continue;
        }

        if (Array.isArray(entry)) {
          for (const item of entry) {
            if (item && typeof item === 'object') {
              const nested = normalizeDialogue(item);
              lines.push(...nested);
            } else if (typeof item === 'string') {
              const split = splitCharacterText(item);
              if (split) {
                lines.push(split);
              } else {
                lines.push({ character: key, text: item });
              }
            }
          }
          continue;
        }

        if (entry && typeof entry === 'object') {
          const nested = normalizeDialogue(entry);
          if (nested.length > 0) {
            lines.push(...nested);
          }
        }
      }

      return lines;
    };

    if (Array.isArray(value)) {
      return value.flatMap((entry) => {
        if (typeof entry === 'string') {
          const split = splitCharacterText(entry);
          return split ? [split] : [{ character: 'Narrator', text: entry }];
        }

        if (!entry || typeof entry !== 'object') return [];
        const record = entry as Record<string, unknown>;
        const directEntry = extractDialogueEntry(record);
        return directEntry ? [directEntry] : [];
      });
    }

    if (value && typeof value === 'object') {
      return collectFromObject(value as Record<string, unknown>);
    }

    return [];
  };

  const normalizeNewInformation = (value: unknown): string[] => {
    const collect = (node: unknown): string[] => {
      if (!node) return [];

      if (typeof node === 'string') {
        return node.trim() ? [node.trim()] : [];
      }

      if (Array.isArray(node)) {
        return node.flatMap((entry) => collect(entry));
      }

      if (typeof node === 'object') {
        const record = node as Record<string, unknown>;
        const entries: string[] = [];

        for (const [key, entry] of Object.entries(record)) {
          if (['new_information', 'newInformation', 'newInfo', 'fact', 'facts', 'discovery', 'discoveries'].includes(key)) {
            entries.push(...collect(entry));
            continue;
          }

          if (typeof entry === 'string' && entry.trim()) {
            entries.push(entry.trim());
          } else if (entry && typeof entry === 'object') {
            entries.push(...collect(entry));
          }
        }

        return entries;
      }

      return [];
    };

    return collect(value).filter((entry) => entry.trim().length > 0);
  };

  const extractStructured = (value: unknown): Partial<AssistantResponse> | null => {
    if (!value || typeof value !== 'object') return null;

    const record = value as Record<string, unknown>;
    const candidateKeys = ['narration', 'suggested_actions', 'suggestedActions', 'dialogue', 'dialogueLine', 'new_information', 'newInformation', 'newInfo', 'characters', 'Characters', 'scene_status', 'sceneStatus'];
    if (candidateKeys.some((key) => key in record)) {
      return record as Partial<AssistantResponse>;
    }

    for (const nestedValue of Object.values(record)) {
      const found = extractStructured(nestedValue);
      if (found) return found;
    }

    return null;
  };

  if (!response) return { narration: '', dialogue: [], suggestions: [], newInformation: [], sceneStatus: 'continue' };

  if (typeof response === 'string') {
    const trimmed = response.trim();
    if (!trimmed) return { narration: '', dialogue: [], suggestions: [], newInformation: [], sceneStatus: 'continue' };

    const candidate = trimmed
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(candidate) as unknown;
      const structured = extractStructured(parsed) ?? extractStructured(candidate);
      if (structured) {
        const narration = typeof structured.narration === 'string' ? structured.narration : candidate;
        const dialogueValue = Array.isArray(structured.dialogue) || structured.dialogue && typeof structured.dialogue === 'object'
          ? structured.dialogue
          : Array.isArray((structured as Record<string, unknown>).characters)
            ? (structured as Record<string, unknown>).characters
            : [];

        return {
          narration,
          dialogue: normalizeDialogue(dialogueValue),
          suggestions: Array.isArray(structured.suggested_actions)
            ? structured.suggested_actions.filter((item): item is string => typeof item === 'string')
            : [],
          newInformation: normalizeNewInformation(structured.new_information ?? (structured as Record<string, unknown>).newInformation ?? (structured as Record<string, unknown>).newInfo),
          sceneStatus: typeof structured.scene_status === 'string'
            ? structured.scene_status
            : typeof (structured as Record<string, unknown>).sceneStatus === 'string'
              ? (structured as Record<string, unknown>).sceneStatus as string
              : 'continue',
        };
      }

      return { narration: candidate, dialogue: [], suggestions: [], newInformation: [], sceneStatus: 'continue' };
    } catch {
      return { narration: candidate, dialogue: [], suggestions: [], newInformation: [], sceneStatus: 'continue' };
    }
  }

  const structured = extractStructured(response);
  if (structured) {
    const narration = typeof structured.narration === 'string' ? structured.narration : '';
    const dialogueValue = Array.isArray(structured.dialogue) || structured.dialogue && typeof structured.dialogue === 'object'
      ? structured.dialogue
      : Array.isArray((structured as Record<string, unknown>).characters)
        ? (structured as Record<string, unknown>).characters
        : [];

    return {
      narration,
      dialogue: normalizeDialogue(dialogueValue),
      suggestions: Array.isArray(structured.suggested_actions)
        ? structured.suggested_actions.filter((item): item is string => typeof item === 'string')
        : [],
      newInformation: normalizeNewInformation(structured.new_information ?? (structured as Record<string, unknown>).newInformation ?? (structured as Record<string, unknown>).newInfo),
      sceneStatus: typeof structured.scene_status === 'string'
        ? structured.scene_status
        : typeof (structured as Record<string, unknown>).sceneStatus === 'string'
          ? (structured as Record<string, unknown>).sceneStatus as string
          : 'continue',
    };
  }

  return { narration: '', dialogue: [], suggestions: [], newInformation: [], sceneStatus: 'continue' };
}

export function ChatScreen() {
  const { currentConversation, messages, setMessages, addMessage, navigate } = useAuth();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyEnded, setStoryEnded] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const bringInputIntoView = (bottomPercent: number = 0.25) => {
    if (!inputRef.current) return;

    requestAnimationFrame(() => {
      const field = inputRef.current;
      if (!field) return;

      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const fieldRect = field.getBoundingClientRect();
      const desiredBottomOffset = viewportHeight * bottomPercent;
      const desiredTop = viewportHeight - fieldRect.height - desiredBottomOffset;
      const delta = desiredTop - fieldRect.top;

      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta, behavior: 'smooth' });
      }
    });
  };

  useEffect(() => {
    const handleResize = () => {
      const nextViewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const keyboardInset = Math.max(0, window.innerHeight - nextViewportHeight);
      const container = scrollContainerRef.current;

      document.documentElement.style.setProperty('--app-height', `${nextViewportHeight}px`);
      setViewportHeight(nextViewportHeight);

      if (container) {
        container.style.paddingBottom = keyboardInset > 0 ? `${Math.max(keyboardInset + 16, 72)}px` : '16px';
      }

      if (document.activeElement === inputRef.current) {
        bringInputIntoView(0.25);
      }
    };

    handleResize();
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const maxHeight = 120;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';

    if (document.activeElement === el) {
      bringInputIntoView(0.25);
    }
  }, [input]);

  useEffect(() => {
    if (!currentConversation) {
      setStoryEnded(false);
      return;
    }

    const ended = messages.some((msg) => {
      if (msg.role !== 'assistant') return false;
      const parsed = parseAssistantResponse(msg.content);
      return parsed.sceneStatus.toLowerCase() === 'end';
    });

    setStoryEnded(ended);
  }, [currentConversation, messages]);

  useEffect(() => {
    if (!currentConversation) return;

    const isFreshConversation = sessionStorage.getItem('delulu_fresh_conversation') === currentConversation._id;

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
    if (storyEnded) return;
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
    sessionStorage.removeItem('delulu_fresh_conversation');
    setInput('');

    try {
      const response = await messageApi.chat(currentConversation._id, content);
      const parsedResponse = parseAssistantResponse(typeof response === 'string' ? response : response ?? undefined);
      const fullAssistantContent = JSON.stringify({
        narration: parsedResponse.narration,
        dialogue: parsedResponse.dialogue,
        suggested_actions: parsedResponse.suggestions,
        new_information: parsedResponse.newInformation,
        scene_status: parsedResponse.sceneStatus,
      });
      setStoryEnded(parsedResponse.sceneStatus.toLowerCase() === 'end');
      const assistantMsg: Message = {
        _id: `res-${Date.now()}`,
        conversationId: currentConversation._id,
        role: 'assistant',
        content: fullAssistantContent,
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
    if (storyEnded) return;
    const content = input.trim();
    if (!content) return;
    await submitMessage(content);
  };

  const handleSuggestionClick = async (optionIndex: number, optionText?: string) => {
    if (storyEnded) return;
    const selectedText = optionText || `Selected Option ${optionIndex}`;
    await submitMessage(selectedText);
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
    <div className="flex flex-col bg-ink-900 safe-top" style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}>
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: '16px' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          {loadingHistory && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <Loader2 className="h-5 w-5 text-accent animate-spin mb-3" />
              <p className="text-ink-300 text-sm text-center max-w-xs">Loading previous chat...</p>
            </div>
          )}

          {!loadingHistory && !sending && messages.length === 0 && (
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

      {!storyEnded && (
        <div className="flex-shrink-0 bg-ink-900/80 backdrop-blur-lg border-t border-ink-700/50 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] safe-bottom-input">
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown} onFocus={() => bringInputIntoView(0.25)}
                placeholder="Continue the story..." rows={1} disabled={sending}
                className="w-full px-4 py-3 rounded-2xl bg-ink-800 border border-ink-600 text-ink-50 text-sm placeholder:text-ink-400 outline-none focus:border-accent/40 transition-colors resize-none disabled:opacity-50 scrollbar-none"
                style={{ maxHeight: '120px', overflowY: 'hidden' }} />
            </div>
            <button onClick={handleSend} disabled={!input.trim() || sending}
              className="flex-shrink-0 h-11 w-11 flex items-center justify-center rounded-2xl bg-accent text-ink-900 transition-all duration-200 hover:bg-accent-glow active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}

      {storyEnded && (
        <div className="flex-shrink-0 bg-ink-900/80 backdrop-blur-lg border-t border-ink-700/50 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] safe-bottom-input">
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-rose/30 bg-rose/10 px-4 py-3 text-center text-sm font-medium text-rose-200">
              Delulu Ended
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, onSuggestionClick }: { message: Message; onSuggestionClick?: (optionIndex: number, optionText?: string) => void }) {
  const isUser = message.role === 'user';
  const parsedAssistant = !isUser ? parseAssistantResponse(message.content) : null;
  const displayContent = parsedAssistant?.narration || message.content;
  const displayDialogue = parsedAssistant?.dialogue ?? [];
  const displayNewInformation = parsedAssistant?.newInformation ?? [];
  const isEndedState = !isUser && parsedAssistant?.sceneStatus?.toLowerCase() === 'end';
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
        {!isUser && (
          <div className="px-4 py-3 text-sm leading-relaxed space-y-3">
            {isEndedState && (
              <div className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-rose-200">
                Delulu Ended
              </div>
            )}

            <p className="whitespace-pre-wrap break-words">{displayContent}</p>

            {displayDialogue.length > 0 && (
              <div className="space-y-2 border-t border-ink-700/80 pt-2">
                {displayDialogue.map((line, index) => (
                  <div key={`${message._id}-dialogue-${index}`} className="text-xs leading-relaxed">
                    <span className="font-medium text-accent">{line.character}:</span>{' '}
                    <span className="text-ink-200">{line.text}</span>
                  </div>
                ))}
              </div>
            )}

            {displayNewInformation.length > 0 && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 px-3 py-2">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-300">New Information</p>
                <ul className="space-y-1 text-xs text-ink-200 leading-relaxed">
                  {displayNewInformation.map((info, index) => (
                    <li key={`${message._id}-new-info-${index}`} className="whitespace-pre-wrap break-words">• {info}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {isUser && (
          <div className="px-4 py-3 text-sm leading-relaxed">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )}

        {!isUser && displaySuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-ink-700/80 px-3 py-3">
            {displaySuggestions.map((suggestion, index) => (
              <button
                key={`${message._id}-suggestion-${index}`}
                type="button"
                onClick={() => onSuggestionClick?.(index + 1, suggestion)}
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
