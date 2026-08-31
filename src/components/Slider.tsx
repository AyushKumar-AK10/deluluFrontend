interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  accent?: 'gold' | 'rose';
}

export function Slider({ label, value, onChange, accent = 'gold' }: SliderProps) {
  const accentColor = accent === 'gold' ? '#e8b86d' : '#e88d8d';
  const accentText = accent === 'gold' ? 'text-accent' : 'text-rose';
  const accentBg = accent === 'gold' ? 'bg-accent/10' : 'bg-rose/10';
  const accentBorder = accent === 'gold' ? 'border-accent/20' : 'border-rose/20';
  const percentage = ((value - 1) / 9) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-ink-200 text-sm font-medium">{label}</label>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${accentBg} border ${accentBorder}`}>
          <span className={`text-xs font-semibold ${accentText}`}>{value}</span>
          <span className="text-ink-400 text-[10px]">/ 10</span>
        </div>
      </div>
      <div className="relative">
        <input
          type="range" min={1} max={10} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
          style={{
            background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, #262633 ${percentage}%, #262633 100%)`,
            height: '6px', borderRadius: '999px', outline: 'none',
          } as React.CSSProperties}
        />
      </div>
      <div className="flex justify-between px-0.5">
        <span className="text-ink-400 text-[10px]">Mild</span>
        <span className="text-ink-400 text-[10px]">Intense</span>
      </div>
    </div>
  );
}
