import type { SupportMessage } from "../../core/orchestrate";

export function SupportCard({ support, onEdit, onContinue, compact = false }: { support: SupportMessage; onEdit?: () => void; onContinue?: () => void; compact?: boolean }) {
  return (
    <div className={compact ? "border-l-2 border-accent pl-4" : "mx-auto max-w-2xl border-t-2 border-accent pt-6"} role="alert">
      {!compact && <p className="label !text-accent">Before the cards</p>}
      <h2 className={`display ${compact ? "text-[1.3rem]" : "mt-3 text-[2.2rem] sm:text-[2.6rem]"}`}>{support.title}</h2>
      <p className={`leading-relaxed text-ink-2 ${compact ? "mt-2 text-[0.98rem]" : "mt-4 text-[1.1rem]"}`}>{support.body}</p>
      <ul className={`space-y-1.5 ${compact ? "mt-3 text-[0.95rem]" : "mt-6 text-[1.02rem]"}`}>
        {support.resources.map((r) => (
          <li key={r.label} className="grid grid-cols-[1.1rem_1fr] text-ink">
            <span className="text-accent" aria-hidden="true">
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
