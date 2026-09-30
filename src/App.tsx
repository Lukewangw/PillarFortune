import { lazy, Suspense } from "react";
import { CelestialBackdrop } from "./components/CelestialBackdrop";
import { Header } from "./components/Header";
import { ReadingPage } from "./features/reading/ReadingPage";
import { EngineProvider } from "./lib/engineContext";
import { AUTHOR_URL, REPO_URL } from "./lib/config";
import { useHashRoute } from "./lib/hashRoute";

const PillarsPage = lazy(() => import("./features/pillars/PillarsPage"));
const LabPage = lazy(() => import("./features/lab/LabPage"));

function Loading() {
  return <p className="label mx-auto max-w-6xl px-6 py-24 text-center">Loading…</p>;
}

export default function App() {
  const route = useHashRoute();
  return (
    <EngineProvider>
      <CelestialBackdrop />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <Header route={route} />
        <main className="flex-1">
          {route.page === "reading" && <ReadingPage key={route.param ?? "new"} readingId={route.param} />}
          <Suspense fallback={<Loading />}>
            {route.page === "pillars" && <PillarsPage />}
            {route.page === "lab" && <LabPage />}
          </Suspense>
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8 sm:px-6">
          <p className="divider label" aria-hidden="true">
            ✦
          </p>
          <div className="mt-5 flex flex-col items-center gap-3 text-center text-[0.92rem] text-star-3 sm:flex-row sm:justify-between sm:text-left">
            <p>For reflection and entertainment — not medical, legal or financial advice.</p>
            <p className="label flex gap-5">
              <a className="transition-colors hover:!text-gold-2" href={REPO_URL} target="_blank" rel="noreferrer">
                Source ↗
              </a>
              <a className="transition-colors hover:!text-gold-2" href={AUTHOR_URL} target="_blank" rel="noreferrer">
                Luke Wang ↗
              </a>
            </p>
          </div>
          <p className="mt-4 text-center text-[0.78rem] text-star-3/80 sm:text-left">
            Card art: Pamela Colman Smith, Rider–Waite–Smith tarot (1909), public domain.
          </p>
        </footer>
      </div>
    </EngineProvider>
  );
}
