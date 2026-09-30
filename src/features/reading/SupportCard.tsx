import type { SupportMessage } from "../../core/orchestrate";

export function SupportCard({ support, onEdit, onContinue, compact = false }: { support: SupportMessage; onEdit?: () => void; onContinue?: () => void; compact?: boolean }) {
  return (
    <div className={compact ? "border-l-2 border-gold/70 pl-4" : "frame mx-auto max-w-2xl px-6 pb-8 pt-9 sm:px-10"} role="alert">
      {!compact && <p className="label">✦ &nbsp;Before the cards&nbsp; ✦</p>}
      <h2 className={`display ${compact ? "text-[1.3rem]" : "mt-3 text-[2.2rem] sm:text-[2.6rem]"}`}>{support.title}</h2>
      <p className={`leading-relaxed text-star-2 ${compact ? "mt-2 text-[0.98rem]" : "mt-4 text-[1.1rem]"}`}>{support.body}</p>
      <ul className={`space-y-1.5 ${compact ? "mt-3 text-[0.95rem]" : "mt-6 text-[1.02rem]"}`}>
        {support.resources.map((r) => (
          <li key={r.label} className="grid grid-cols-[1.1rem_1fr] text-star">
            <span className="text-gold" aria-hidden="true">
              →
            </span>
            {r.href ? (
              <a href={r.href} target="_blank" rel="noreferrer" className="link">
                {r.label} ↗
              </a>
            ) : (
              <span>{r.label}</span>
            )}
          </li>
        ))}
      </ul>
      {(onEdit || (support.canContinue && onContinue)) && (
        <div className="mt-8 flex flex-wrap gap-3">
          {onEdit && (
            <button type="button" onClick={onEdit} className="btn btn-primary">
              Edit my question
            </button>
          )}
          {support.canContinue && onContinue && (
            <button type="button" onClick={onContinue} className="btn btn-secondary">
              I'm okay — continue to the reading
            </button>
          )}
        </div>
      )}
    </div>
  );
}
