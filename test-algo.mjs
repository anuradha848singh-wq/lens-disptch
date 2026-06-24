const CLUSTER_STOP_WORDS = new Set(["this", "that", "with", "from", "they", "will", "would", "could", "should", "what", "when", "where", "which", "there", "their", "have", "been", "were", "also", "into", "over", "after", "some", "them", "because", "about", "these", "only"]);
const NEWS_NOISE = new Set([
  "says", "said", "say", "report", "reports", "new", "latest", "update",
  "breaking", "watch", "live", "news", "amid", "after", "over", "amid",
  "first", "last", "back", "year", "years", "make", "made", "time",
  "more", "most", "than", "other", "just", "like", "gets", "got",
]);

function extractKeywords(title) {
  return new Set(title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3 && !CLUSTER_STOP_WORDS.has(w)));
}

function extractEntities(title, description) {
  const text = `${title} ${description || ""}`;
  const entities = new Set();
  const properNouns = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  properNouns.forEach(e => entities.add(e));
  const acronyms = text.match(/\b[A-Z]{2,5}\b/g) || [];
  acronyms.forEach(e => entities.add(e));
  return entities;
}

function extractTopicFingerprint(title, description = "") {
  const text = `${title} ${description}`.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !NEWS_NOISE.has(w) && !CLUSTER_STOP_WORDS.has(w));
  return new Set(text);
}

function calculateSimilarityScore(artNew, artExisting) {
  const artKeywords = extractKeywords(artNew.title);
  const artEntities = extractEntities(artNew.title, artNew.description);
  const artFingerprint = extractTopicFingerprint(artNew.title, artNew.description);
  
  const clusterKeywords = extractKeywords(artExisting.title);
  const clusterEntities = extractEntities(artExisting.title, artExisting.description);
  const clusterFingerprint = extractTopicFingerprint(artExisting.title, artExisting.description);

  // Entities
  const sharedEntities = Array.from(artEntities).filter(e => clusterEntities.has(e)).length;
  const entityMatchScore = sharedEntities >= 2 ? 0.85 
    : sharedEntities === 1 ? 0.45 
    : 0;

  // Keywords
  const kwIntersect = Array.from(artKeywords).filter(w => clusterKeywords.has(w)).length;
  const kwUnion = new Set([...artKeywords, ...clusterKeywords]).size;
  const kwScore = kwUnion > 0 ? kwIntersect / kwUnion : 0;

  // Fingerprint
  const fpIntersect = Array.from(artFingerprint).filter(w => clusterFingerprint.has(w)).length;
  const fpUnion = new Set([...artFingerprint, ...clusterFingerprint]).size;
  const fpScore = fpUnion > 0 ? fpIntersect / fpUnion : 0;

  // Composite
  const composite = Math.max(
    entityMatchScore,
    (kwScore * 0.4) + (fpScore * 0.35) + (entityMatchScore * 0.25)
  );

  return { 
    score: Math.min(1, composite), 
    reasons: { kwScore, entityMatchScore, fpScore, sharedEntities } 
  };
}

console.log("TEST 1 - Very Similar (Apple iPhone):");
console.log(calculateSimilarityScore(
  { title: "Apple releases new iPhone 15", description: "Apple has announced its new iPhone today." },
  { title: "Apple announces iPhone 15 launch", description: "The new iPhone is here from Apple." }
));

console.log("\nTEST 2 - Moderate Similarity (Senate Border Bill):");
console.log(calculateSimilarityScore(
  { title: "Senate passes controversial border security bill", description: "The US Senate approved the measure with a slim majority." },
  { title: "Border bill approved by Senate", description: "Lawmakers vote to pass the new border regulations." }
));

console.log("\nTEST 3 - Acronym Match (US/NATO):");
console.log(calculateSimilarityScore(
  { title: "US and NATO coordinate on defense", description: "High-level meetings in Brussels." },
  { title: "NATO and US defense coordination", description: "Military alliance discusses regional security." }
));
