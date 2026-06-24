SELECT '--- 4.1 Total articles ---' as marker;
SELECT COUNT(*) as total_articles FROM articles;

SELECT '--- 4.2 Total clusters ---' as marker;
SELECT COUNT(*) as total_clusters FROM clusters;

SELECT '--- 4.3 Total publishers ---' as marker;
SELECT COUNT(*) as total_publishers FROM publishers;

SELECT '--- 4.4 Clustering quality ---' as marker;
SELECT 
  MIN(source_count) as min_sources,
  MAX(source_count) as max_sources,
  ROUND(AVG(source_count), 2) as avg_sources,
  COUNT(*) FILTER (WHERE source_count = 1) as single_source,
  COUNT(*) FILTER (WHERE source_count >= 2) as two_plus,
  COUNT(*) FILTER (WHERE source_count >= 5) as five_plus,
  COUNT(*) FILTER (WHERE source_count >= 10) as ten_plus,
  COUNT(*) as total
FROM clusters;

SELECT '--- 4.5 Embedding coverage (articles table) ---' as marker;
SELECT
  COUNT(*) as total_articles,
  COUNT(embedding) as has_embedding,
  COUNT(*) - COUNT(embedding) as missing_embedding,
  ROUND(COUNT(embedding)::numeric / COUNT(*) * 100, 1) as pct_embedded
FROM articles;

SELECT '--- 4.5b Embedding coverage (article_embeddings table) ---' as marker;
SELECT
  (SELECT COUNT(*) FROM articles) as total_articles,
  COUNT(*) as has_embedding,
  (SELECT COUNT(*) FROM articles) - COUNT(*) as missing_embedding,
  ROUND(COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM articles), 0) * 100, 1) as pct_embedded
FROM article_embeddings;

SELECT '--- 4.6 Summary coverage ---' as marker;
SELECT
  COUNT(*) as total_clusters,
  COUNT(ai_summary) as has_summary,
  ROUND(COUNT(ai_summary)::numeric / COUNT(*) * 100, 1) as pct_summarized
FROM clusters;

SELECT '--- 4.7 Indian sources ---' as marker;
SELECT name, bias_rating, active, fail_count
FROM publishers
WHERE name IN (
  'The Hindu', 'Indian Express', 'NDTV', 
  'The Wire', 'LiveMint', 'The Print',
  'Scroll.in', 'Business Standard',
  'Hindustan Times', 'Economic Times',
  'Swarajya', 'Republic World', 'News18',
  'Newslaundry', 'The Quint'
)
ORDER BY name;

SELECT '--- 4.8 Recent fetch activity ---' as marker;
SELECT 
  name,
  last_fetched_at,
  fail_count,
  active,
  ROUND(EXTRACT(EPOCH FROM (NOW() - last_fetched_at))/60) as mins_ago
FROM publishers
WHERE last_fetched_at IS NOT NULL
ORDER BY last_fetched_at DESC
LIMIT 15;

SELECT '--- 4.9 Top clusters ---' as marker;
SELECT 
  headline,
  source_count,
  left_count,
  center_count, 
  right_count,
  shannon_diversity,
  category_slug,
  first_seen_at
FROM clusters
ORDER BY source_count DESC
LIMIT 10;

SELECT '--- 4.10 Bias distribution ---' as marker;
SELECT 
  p.bias_rating,
  COUNT(a.id) as article_count
FROM articles a
JOIN publishers p ON a.source_id = p.id
GROUP BY p.bias_rating
ORDER BY article_count DESC;
