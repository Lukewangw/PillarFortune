// Shared Vitest setup. DOM matchers are registered only when a DOM is present,
// so pure-TypeScript tests of src/core keep running in the node environment.
if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
}
export {};
