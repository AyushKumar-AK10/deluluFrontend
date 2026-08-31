interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const dimensions = { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-20 w-20' };
  return (
    <div className={`${dimensions[size]} ${className} relative flex items-center justify-center`}>
      <svg viewBox="0 0 48 48" fill="none" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" stroke="url(#logo-grad)" strokeWidth="1.5" opacity="0.4" />
        <path d="M16 14C16 14 14 24 20 28C26 32 32 28 32 20" stroke="url(#logo-grad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="20" cy="20" r="2.5" fill="#e8b86d" />
        <circle cx="28" cy="18" r="2.5" fill="#e8b86d" opacity="0.7" />
        <path d="M18 34C18 34 22 36 28 34" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <defs>
          <linearGradient id="logo-grad" x1="12" y1="12" x2="36" y2="36">
            <stop stopColor="#f0c98a" /><stop offset="1" stopColor="#d4a85a" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
