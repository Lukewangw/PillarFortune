import { lazy, Suspense } from "react";
import { CardDefs } from "./components/CardArt";
import { Header } from "./components/Header";
import { Starfield } from "./components/Starfield";
import { ReadingPage } from "./features/reading/ReadingPage";
import { EngineProvider } from "./lib/engineContext";
import { REPO_URL } from "./lib/config";
import { useHashRoute } from "./lib/hashRoute";

const PillarsPage = lazy(() => import("./features/pillars/PillarsPage"));
const LabPage = lazy(() => import("./features/lab/LabPage"));

function Loading() {
  return <div className="mx-auto max-w-6xl px-6 py-24 text-center text-mist-400">Loading…</div>;
}

export default function App() {
  const route = useHashRoute();
  return (
    <EngineProvider>
      <CardDefs />
      <Starfield />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <Header route={route} />
        <main className="flex-1">
          {route.page === "reading" && <ReadingPage key={route.param ?? "new"} readingId={route.param} />}
          <Suspense fallback={<Loading />}>
            {route.page === "pillars" && <PillarsPage />}
            {route.page === "lab" && <LabPage />}
          </Suspense>
        </main>
        <footer className="relative z-10 border-t border-white/5 py-8 text-center text-xs text-mist-500">
          <p>
            PillarFortune is for reflection and entertainment — not medical, legal or financial advice.{" "}
            <a className="text-mist-400 underline-offset-4 hover:underline" href={REPO_URL} target="_blank" rel="noreferrer">
              Source on GitHub
            </a>
          </p>
        </footer>
      </div>
    </EngineProvider>
  );
}
