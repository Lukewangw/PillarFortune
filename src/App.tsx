import { lazy, Suspense } from "react";
import { CardDefs } from "./components/CardArt";
import { Header } from "./components/Header";
import { ReadingPage } from "./features/reading/ReadingPage";
import { EngineProvider } from "./lib/engineContext";
import { AUTHOR_URL, REPO_URL } from "./lib/config";
import { useHashRoute } from "./lib/hashRoute";

const PillarsPage = lazy(() => import("./features/pillars/PillarsPage"));
const LabPage = lazy(() => import("./features/lab/LabPage"));

function Loading() {
  return <p className="label mx-auto max-w-6xl px-6 py-24">Loading…</p>;
}

export default function App() {
  const route = useHashRoute();
  return (
    <EngineProvider>
      <CardDefs />
      <div className="flex min-h-dvh flex-col">
        <Header route={route} />
        <main className="flex-1">
          {route.page === "reading" && <ReadingPage key={route.param ?? "new"} readingId={route.param} />}
          <Suspense fallback={<Loading />}>
            {route.page === "pillars" && <PillarsPage />}
            {route.page === "lab" && <LabPage />}
          </Suspense>
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
          <div className="flex flex-col gap-2 border-t border-rule pt-5 text-sm text-ink-3 sm:flex-row sm:items-baseline sm:justify-between">
            <p>For reflection and entertainment — not medical, legal or financial advice.</p>
            <p className="label flex gap-4">
              <a className="hover:text-ink" href={REPO_URL} target="_blank" rel="noreferrer">
                Source ↗
              </a>
              <a className="hover:text-ink" href={AUTHOR_URL} target="_blank" rel="noreferrer">
                Luke Wang ↗
              </a>
            </p>
          </div>
        </footer>
      </div>
    </EngineProvider>
  );
}
