import { performance } from "perf_hooks";

export interface MetricEntry {
  stage: string;
  durationMs: number;
  status: string;
  errorType?: string;
  articleUrl?: string;
}

export const benchmarkMetrics = {
  data: [] as MetricEntry[],
  record(stage: string, entry: Omit<MetricEntry, 'stage'>) {
    this.data.push({ stage, ...entry });
  },
  clear() {
    this.data = [];
  }
};

export async function timed<T>(
  stage: string,
  fn: () => Promise<T>,
  extra?: { articleUrl?: string }
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    benchmarkMetrics.record(stage, {
      durationMs: performance.now() - start,
      status: "success",
      articleUrl: extra?.articleUrl
    });
    return result;
  } catch (err: any) {
    benchmarkMetrics.record(stage, {
      durationMs: performance.now() - start,
      status: "error",
      errorType: err instanceof Error ? err.message : String(err),
      articleUrl: extra?.articleUrl
    });
    throw err;
  }
}
