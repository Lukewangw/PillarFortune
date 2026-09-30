export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="15" y="6" width="34" height="52" rx="5" fill="#0b0a17" stroke="url(#pf-gold)" strokeWidth="2.5" />
      <rect x="20" y="11" width="24" height="42" rx="3" fill="none" stroke="url(#pf-gold)" strokeOpacity="0.45" strokeWidth="1.2" />
      <path d="M32 19l2.6 7.4H42l-6 4.4 2.3 7.2L32 33.6 25.7 38l2.3-7.2-6-4.4h7.4z" fill="url(#pf-gold)" />
      <path d="M26 45h12" stroke="url(#pf-gold)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
