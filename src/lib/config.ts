/**
 * Where the live API lives:
 *  - served by the Cloudflare Worker: same origin ("")
 *  - GitHub Pages build: VITE_API_BASE_URL (the Worker's URL), or none → offline engine only
 */
const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") || undefined;
export const API_BASE = configured ?? (import.meta.env.MODE === "pages" ? null : "");
export const REPO_URL = "https://github.com/Lukewangw/PillarFortune";
export const codeLink = (path: string) => `${REPO_URL}/blob/main/${path}`;
