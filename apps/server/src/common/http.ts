export class UpstreamError extends Error {
  constructor(
    public readonly service: string,
    public readonly status: number | null,
    message: string,
  ) {
    super(`${service}: ${message}`);
    this.name = "UpstreamError";
  }
}

export interface FetchJsonOptions {
  service: string;
  timeoutMs: number;
  headers?: Record<string, string>;
}

export async function fetchJson<T>(url: string, opts: FetchJsonOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, { headers: opts.headers, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new UpstreamError(opts.service, res.status, `HTTP ${res.status} ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new UpstreamError(opts.service, null, isAbort ? `timeout after ${opts.timeoutMs}ms` : String(err));
  } finally {
    clearTimeout(timer);
  }
}

/** 배열을 동시 실행 수 상한을 두고 처리한다. 상대 API 의 rate limit 을 지키기 위함. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T, i);
    }
  });
  await Promise.all(workers);
  return results;
}
