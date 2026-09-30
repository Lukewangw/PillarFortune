import { ExternalLink, HeartHandshake } from "lucide-react";
import type { SupportMessage } from "../../core/orchestrate";

export function SupportCard({ support, onEdit, onContinue, compact = false }: { support: SupportMessage; onEdit?: () => void; onContinue?: () => void; compact?: boolean }) {
  return (
    <div className={`panel border-rose-300/25 ${compact ? "p-4" : "mx-auto max-w-2xl p-6 sm:p-8"}`} role="alert">
      <div className="flex items-start gap-3">
        <HeartHandshake className="mt-1 h-6 w-6 shrink-0 text-rose-300" />
        <div>
          <h2 className={`display ${compact ? "text-xl" : "text-3xl"}`}>{support.title}</h2>
          <p className="mt-3 leading-relaxed text-mist-300">{support.body}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {support.resources.map((r) => (
              <li key={r.label} className="flex items-center gap-2 text-mist-200">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                {r.href ? (
                  <a href={r.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-rose-300/40 underline-offset-4 hover:text-mist-100">
                    {r.label} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  r.label
                )}
              </li>
            ))}
          </ul>
          {(onEdit || (support.canContinue && onContinue)) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {onEdit && (
                <button type="button" onClick={onEdit} className="btn-ghost text-sm">
                  Edit my question
                </button>
              )}
              {support.canContinue && onContinue && (
                <button type="button" onClick={onContinue} className="btn-ghost text-sm">
                  I'm okay — continue to the reading
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
