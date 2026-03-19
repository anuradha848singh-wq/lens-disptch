function extractTokens(text) {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, "").trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 3);
  const stopWords = new Set(["this", "that", "with", "from", "they", "will", "would", "could", "should", "what", "when", "where", "which", "there", "their", "have", "been", "were", "also", "into", "over", "after", "some", "them", "because", "about", "these", "only"]);
  return new Set(words.filter(w => !stopWords.has(w)));
}

function extractEntities(title, description) {
  const text = `${title} ${description || ""}`;
  const matches = text.match(/\b[A-Z][a-z]+\b/g) || [];
  return new Set(matches);
}

function calculateSimilarityScore(artNew, artExisting) {
  const tokensA = extractTokens(artNew.title);
  const tokensB = extractTokens(artExisting.title);
  const intersectionTokens = Array.from(tokensA).filter(t => tokensB.has(t)).length;
  const unionTokens = new Set(Array.from(tokensA).concat(Array.from(tokensB))).size;
  const titleJaccard = unionTokens > 0 ? intersectionTokens / unionTokens : 0;
  
  const entitiesA = extractEntities(artNew.title, artNew.description || "");
  const entitiesB = extractEntities(artExisting.title, artExisting.description || "");
  const intersectionEntities = Array.from(entitiesA).filter(e => entitiesB.has(e)).length;
  const unionEntities = new Set(Array.from(entitiesA).concat(Array.from(entitiesB))).size;
  const entityJaccard = unionEntities > 0 ? intersectionEntities / unionEntities : 0;
  
  let timeScore = 0.5;
  if (artNew.publishedAt && artExisting.publishedAt) {
    const tA = new Date(artNew.publishedAt).getTime();
    const tB = new Date(artExisting.publishedAt).getTime();
    if (!isNaN(tA) && !isNaN(tB)) {
      const diffHours = Math.abs(tA - tB) / (1000 * 60 * 60);
      timeScore = Math.max(0, 1 - (diffHours / 72));
    }
  }
  
  const w_t = 0.40;
  const w_ent = 0.40;
  const w_time = 0.20;
  
  const compositeScore = (w_t * titleJaccard) + (w_ent * entityJaccard) + (w_time * timeScore);
  
  return { 
    score: compositeScore, 
    reasons: { titleJaccard, entityJaccard, timeScore } 
  };
}

console.log("TEST 1 - Very Similar:");
console.log(calculateSimilarityScore(
  { title: "Apple releases new iPhone 15", description: "Apple has announced its new iPhone today.", publishedAt: "2023-01-01T12:00:00Z" },
  { title: "Apple announces iPhone 15 launch", description: "The new iPhone is here from Apple.", publishedAt: "2023-01-01T13:00:00Z" }
));

console.log("\nTEST 2 - Moderate Similarity:");
console.log(calculateSimilarityScore(
  { title: "Senate passes controversial border security bill", description: "The US Senate approved the measure with a slim majority.", publishedAt: "2023-01-01T12:00:00Z" },
  { title: "Border bill approved by Senate", description: "Lawmakers vote to pass the new border regulations.", publishedAt: "2023-01-01T12:00:00Z" }
));

console.log("\nTEST 3 - Different:");
console.log(calculateSimilarityScore(
  { title: "Apple releases new iPhone 15", description: "Apple has announced its new iPhone today.", publishedAt: "2023-01-01T12:00:00Z" },
  { title: "Senate passes controversial border security bill", description: "Senate approves measure.", publishedAt: "2023-01-01T12:00:00Z" }
));
