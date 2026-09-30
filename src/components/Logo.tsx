/** A vermilion seal bearing 卜 (bǔ), the oldest character for divination: a crack in an oracle bone. */
export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="5" fill="#b93a26" />
      <rect x="10" y="10" width="44" height="44" rx="1.5" fill="none" stroke="#faf7f1" strokeWidth="2.4" />
      <rect x="26" y="16" width="5.4" height="32" fill="#faf7f1" />
      <path d="M31 28.5 L43 36.5" stroke="#faf7f1" strokeWidth="5.4" strokeLinecap="round" />
    </svg>
  );
}
