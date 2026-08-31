export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="h-2 w-2 rounded-full bg-ink-300 animate-pulse-soft" style={{ animationDelay: '0s' }} />
      <span className="h-2 w-2 rounded-full bg-ink-300 animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
      <span className="h-2 w-2 rounded-full bg-ink-300 animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
    </div>
  );
}
