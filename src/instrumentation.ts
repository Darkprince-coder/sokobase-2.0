export async function register() {
  // Node.js runtime only: the proxy runs separately and reads just the public host variables.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkEnv } = await import("@/lib/env");
    checkEnv();
  }
}
