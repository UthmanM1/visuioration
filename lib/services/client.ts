/**
 * Demo transport. Every service in this folder resolves against local demo data.
 * To connect a real backend, replace `demoResolve` with a fetch to your API
 * (REST, GraphQL, Supabase, etc.) and keep the service signatures unchanged.
 */
export async function demoResolve<T>(value: T, latencyMs = 280): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  return structuredClone(value);
}

export class DemoServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoServiceError";
  }
}
