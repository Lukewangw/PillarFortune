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

function Section({ id, n, kicker, title, lead, children }: { id: string; n: string; kicker: string; title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-gold/50 pb-16 pt-6">
      <div className="grid gap-3 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
        <p className="label pt-2">
          <span className="text-gold">§{n}</span> · {kicker}
        </p>
        <div>
          <h2 className="display text-[2rem] sm:text-[2.5rem]">{title}</h2>
          <div className="mt-4 max-w-[46rem] text-[1.08rem] leading-relaxed text-star-2">{lead}</div>
        </div>
      </div>
      <div className="mt-10">{children}</div>
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
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-3xl animate-rise text-center">
        <p className="label">✦ &nbsp;How it works&nbsp; ✦</p>
        <h1 className="display mt-6 text-[2.6rem] sm:text-[3.8rem]">
          An LLM you can <em className="foil animate-shimmer pr-1 italic">check</em>
        </h1>
        <p className="lede mx-auto mt-5 max-w-[42rem]">
          Tarot is a playful domain with a serious engineering core: a language model has to interpret facts it did not choose, in a strict format, without inventing
          anything — and fail safely when it does. Everything on this page is live code running in your browser, the same code the Cloudflare Worker runs.
        </p>
      </div>

      <div className="mt-14 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Invalid outputs shipped" value={`${simInvalid} / ${simRequests.toLocaleString()}`} caption="simulated requests at 10–70% model failure rates; bad outputs are repaired or replaced" />
        <StatTile label="Cards chosen by the LLM" value="0" caption="a seeded, verifiable shuffle deals the cards; the model only sees the result" />
        <StatTile label={`Crisis recall · ${splits.test ? "blind test" : "dev"}`} value={`${(router.crisis.recall.served * 100).toFixed(1)}%`} caption="question router: a trained classifier plus high-precision rules" />
        <StatTile label="Four Pillars vs. reference" value="100%" caption="agreement with lunar-python on 4,000 random birth times" />
      </div>

      <nav aria-label="On this page" className="mb-14 mt-14 border-t border-line pt-5">
        <p className="label">Contents</p>
        <ol className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {TOC.map(([id, label], i) => (
            <li key={id}>
              <a
                href={`#/lab/${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group flex items-baseline gap-3 text-[1.02rem] text-star transition-colors hover:text-gold"
              >
                <span className="font-mono text-[0.72rem] text-gold">§{i + 1}</span>
                <span className="underline decoration-line-2 underline-offset-4 group-hover:decoration-gold">{label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section
        id="architecture"
        n="1"
        kicker="Architecture"
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
        n="2"
        kicker="Output contract"
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
        n="3"
        kicker="Bounded retries"
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
        n="4"
        kicker="Question router"
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
        n="5"
        kicker="Draw engine"
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
        n="6"
        kicker="Evaluation"
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
        n="7"
        kicker="Monitoring"
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

      <p className="border-t border-line pt-6 text-[1rem] text-star-2">
        Source, tests and the ML scripts are on{" "}
        <a className="link" href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        . Start with{" "}
        <a className="link font-mono text-[0.85rem]" href={codeLink("src/core/orchestrate.ts")} target="_blank" rel="noreferrer">
          src/core/orchestrate.ts
        </a>
        , the single request path shared by every runtime.
      </p>
    </div>
  );
}
