import { useEffect, useState } from "react";

export type Route = { page: "reading" | "pillars" | "lab"; param?: string };

function parse(hash: string): Route {
  const [page, param] = hash.replace(/^#\/?/, "").split("/");
  if (page === "pillars") return { page: "pillars" };
  if (page === "lab" || page === "how-it-works") return { page: "lab", param };
  if (page === "r" && param) return { page: "reading", param };
  return { page: "reading" };
}

/** Hash routing keeps deep links working on GitHub Pages without server rewrites. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
