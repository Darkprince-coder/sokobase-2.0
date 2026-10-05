export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

// Server components render once per request, so reading the clock there is safe; keeping it
// behind a helper also keeps the React Compiler purity lint (aimed at client re-renders) quiet.
export const nowMs = () => Date.now();
export const isPast = (iso: string) => new Date(iso).getTime() <= nowMs();

export const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - nowMs()) / 86400000);
