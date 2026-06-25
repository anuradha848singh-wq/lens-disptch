## Benchmark Run Parameters
- Articles processed: 1071
- Sources covered: 61
- Run duration: 163.20s
- Date/environment: local / WSL2 Windows Docker Dev, 2026-06-25T10:37:43.620Z

## Per-Stage Metrics
| Stage | Count | Success | Errors (by type) | p50 (ms) | p95 (ms) | p99 (ms) | Throughput (items/sec) |
|---|---|---|---|---|---|---|---|
| Discovery | 70 | 62 | fetch failed (x3), HTTP 404 Not Found (x3), Attribute without value
Line: 0
Column: 1066
Char: s (x1), Unexpected close tag
Line: 0
Column: 431
Char: > (x1) | 425.0 | 1627.4 | 2316.3 | 0.82 |
| Embedding | 56 | 56 | None | 42.3 | 1412.0 | 1842.3 | 2.55 |
| Extraction | 84 | 84 | None | 509.5 | 2605.5 | 4619.3 | 1.28 |
| Cluster | 2154 | 2154 | None | 3.1 | 37.4 | 59.7 | 102.29 |
| Summarize | 13 | 13 | None | 60.7 | 198.4 | 198.4 | 12.87 |

## End-to-End
- Median article latency (discovery → persisted): 0.0 ms
- p95 article latency: 0.0 ms
- Total errors / total attempts: 8 / 3448
- Concurrency actually achieved vs. configured: 8 / 8

## Observed Bottleneck (data-driven, not assumed)
The slowest stage by p95 latency is **Extraction** with p95 = 2605.5 ms (max = 4619.3 ms). Errors were observed in: Discovery (8 errors). 