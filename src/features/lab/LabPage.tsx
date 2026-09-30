import type { ReactNode } from "react";
import simulation from "../../../ml/evals/results/simulation.json";
import routerMetrics from "../../../ml/router/reports/system-metrics.json";
import { codeLink, REPO_URL } from "../../lib/config";
import { Architecture } from "./Architecture";
import { StatTile } from "./charts";
import { DrawLab } from "./DrawLab";
import { EvalResults } from "./EvalResults";
import { LiveMetrics } from "./LiveMetrics";
import { ReliabilityLab } from "./ReliabilityLab";
import { RouterLab } from "./RouterLab";
import { ValidatorPlayground } from "./ValidatorPlayground";

function Section({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white/5 py-14">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display mt-2 text-3xl text-balance sm:text-4xl">{title}</h2>
      <div className="mt-3 max-w-3xl text-mist-400">{lead}</div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

const TOC = [
  ["architecture", "Architecture"],
  ["contract", "Output contract"],
  ["reliability", "Bounded retries"],
  ["router", "Question router"],
  ["draw", "Draw engine"],
  ["evals", "Evaluation"],
  ["monitoring", "Monitoring"],
];

export default function LabPage() {
  const splits = routerMetrics.splits as Record<string, (typeof routerMetrics.splits)["dev"]>;
  const router = splits.test ?? splits.dev;
  const simRequests = simulation.grid.length * simulation.requestsPerCell;
  const simInvalid = simulation.grid.reduce((s, c) => s + c.invalidShipped, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
      <p className="eyebrow">How it works</p>
      <h1 className="display mt-3 max-w-4xl text-4xl leading-tight text-balance sm:text-5xl">An LLM you can check: the engineering behind a tarot reading</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-mist-400">
        Tarot is a playful domain with a serious ML-engineering core: a language model must interpret facts it did not choose, in a strict format, without inventing anything —
        and fail safely when it does. Every component on this page is live code running in your browser, the same code the Cloudflare Worker runs.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Invalid outputs shipped" value={`${simInvalid} / ${simRequests.toLocaleString()}`} caption="simulated requests at 10–70% model failure rates; bad outputs are repaired or replaced" />
        <StatTile label="Card selection by the LLM" value="0%" caption="cards come from a seeded, verifiable shuffle; the model only ever sees the result" />
        <StatTile label={`Crisis recall (${splits.test ? "blind test" : "dev"})`} value={`${(router.crisis.recall.served * 100).toFixed(0)}%`} caption="question router: trained classifier + high-precision rules" />
        <StatTile label="Four Pillars vs. reference" value="100%" caption="agreement with lunar-python on 4,000 random birth times" />
      </div>

      <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-2">
        {TOC.map(([id, label]) => (
          <a key={id} href={`#/lab/${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }} className="chip transition hover:border-gold-400/40 hover:text-mist-100">
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="architecture"
        eyebrow="1 · Architecture"
        title="Deterministic facts in, validated interpretation out"
        lead={
          <>
            The system separates what must be exact from what may be generated. Routing and the draw are deterministic and testable; the LLM works inside a contract that is
            checked on every call.
          </>
        }
      >
        <Architecture />
      </Section>

      <Section
        id="contract"
        eyebrow="2 · Output contract"
        title="Break the output and watch the validator react"
        lead={
          <>
            A per-draw JSON Schema constrains decoding; post-hoc checks catch what decoding cannot — card/position/orientation mismatches, cards named in free text that were
            never drawn (English or Chinese), and overconfident or directive language. Edit the JSON or inject a fault.
          </>
        }
      >
        <ValidatorPlayground />
      </Section>

      <Section
        id="reliability"
        eyebrow="3 · Bounded retries"
        title="How many retries buy how much reliability"
        lead={
          <>
            Each rejected output is sent back with its JSON-pointer errors at a lower temperature, up to three calls within a 45 s deadline; transient errors back off,
            constraint failures drop to unconstrained decoding, and exhausted requests get the knowledge-base fallback. The simulation below runs the real pipeline against a
            model that fails on purpose.
          </>
        }
      >
        <ReliabilityLab />
      </Section>

      <Section
        id="router"
        eyebrow="4 · Question router"
        title="A 0.1 ms model in front of a 70B model"
        lead={
          <>
            Before any LLM call, a small classifier trained for this app predicts the question's focus (to personalize the prompt) and its safety class (crisis questions get
            support resources instead of a reading; medical and high-stakes questions get a constrained, referral-first prompt). It is trained in Python and served in
            TypeScript with a parity test.
          </>
        }
      >
        <RouterLab />
      </Section>

      <Section
        id="draw"
        eyebrow="5 · Draw engine"
        title="A shuffle you can replay and audit"
        lead={
          <>
            The browser shows the deck face down from a 128-bit seed; your picks index into it; the Worker recomputes the cards from (seed, picks) and never trusts a card sent
            by a client. The same seed always yields the same reading, which also makes evaluations reproducible.
          </>
        }
      >
        <DrawLab />
      </Section>

      <Section
        id="evals"
        eyebrow="6 · Evaluation"
        title="An offline harness for the real model"
        lead={
          <>
            The harness replays a fixed dataset through the production code path under four ablations — from the project's original single-call prompt to the full pipeline —
            and reports validity, fallback, cost and latency per variant and per subset.
          </>
        }
      >
        <EvalResults />
      </Section>

      <Section
        id="monitoring"
        eyebrow="7 · Monitoring"
        title="Every request leaves a trace"
        lead={
          <>
            Each reading and follow-up stores its span timeline, attempts, issue codes, latency and token counts in D1; a daily model-call budget and per-network limits degrade
            to the offline composer instead of failing. Open any reading's “Inspect pipeline” to see its trace.
          </>
        }
      >
        <LiveMetrics />
      </Section>

      <p className="border-t border-white/5 pt-10 text-sm text-mist-500">
        Source, tests and the ML scripts are on{" "}
        <a className="text-gold-300 hover:underline" href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        . Start with{" "}
        <a className="font-mono text-xs text-gold-300/80 hover:underline" href={codeLink("src/core/orchestrate.ts")} target="_blank" rel="noreferrer">
          src/core/orchestrate.ts
        </a>
        , the single request path shared by every runtime.
      </p>
    </div>
  );
}
