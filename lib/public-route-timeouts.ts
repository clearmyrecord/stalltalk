export const PUBLIC_ROUTE_TIMEOUT_MS = 1_800;
export const PUBLIC_ANALYTICS_TIMEOUT_MS = 750;

export class PublicRouteTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "PublicRouteTimeoutError";
  }
}

export async function withPublicTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = PUBLIC_ROUTE_TIMEOUT_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new PublicRouteTimeoutError(label, timeoutMs)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
