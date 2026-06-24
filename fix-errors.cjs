const fs = require('fs');

// 1. Fix rss-sources.ts duplicate keys
let rss = fs.readFileSync('server/rss-sources.ts', 'utf8');
let oppCount = 0;
rss = rss.replace(/"pro_opposition":/g, () => {
  oppCount++;
  return oppCount === 1 ? '"pro_opposition":' : '"pro_opposition_' + oppCount + '":';
});
let estCount = 0;
rss = rss.replace(/"pro_establishment":/g, () => {
  estCount++;
  return estCount === 1 ? '"pro_establishment":' : '"pro_establishment_' + estCount + '":';
});
fs.writeFileSync('server/rss-sources.ts', rss);

// 2. Fix news-fetcher.ts keys iteration
let fetcher = fs.readFileSync('server/news-fetcher.ts', 'utf8');
fetcher = fetcher.replace(
  /for \(const biasTier of \["AGGREGATORS", "neutral", "pro_opposition", "pro_establishment", "pro_opposition", "pro_establishment"\]\)/g,
  'for (const biasTier of Object.keys(RSS_SOURCES))'
);
fs.writeFileSync('server/news-fetcher.ts', fetcher);

// 3. Fix client/src/components/StoryCard.tsx missing 'cn'
let storyCard = fs.readFileSync('client/src/components/StoryCard.tsx', 'utf8');
if (!storyCard.includes('import { cn }')) {
  storyCard = "import { cn } from '@/lib/utils';\n" + storyCard;
  fs.writeFileSync('client/src/components/StoryCard.tsx', storyCard);
}

// 4. Fix server/routes/social.routes.ts implicitly any 'c'
let socialRoutes = fs.readFileSync('server/routes/social.routes.ts', 'utf8');
socialRoutes = socialRoutes.replace(/\(c\) => {/g, '(c: any) => {');
fs.writeFileSync('server/routes/social.routes.ts', socialRoutes);

// 5. Fix server/storage.ts(2097,13) type mismatch for biasRating
let storage = fs.readFileSync('server/storage.ts', 'utf8');
storage = storage.replace(/eq\(publishers.biasRating, params.bias\)/g, 'eq(publishers.biasRating, params.bias as any)');
fs.writeFileSync('server/storage.ts', storage);

// 6. Fix server/workers/dynamic-bias-scorer.ts PUBLISHER_BIAS_SEED
if (fs.existsSync('server/workers/dynamic-bias-scorer.ts')) {
  let scorer = fs.readFileSync('server/workers/dynamic-bias-scorer.ts', 'utf8');
  scorer = scorer.replace(/PUBLISHER_BIAS_SEED/g, 'EXTENDED_PUBLISHER_BIAS_DB');
  scorer = scorer.replace(/\(p\) =>/g, '(p: any) =>');
  fs.writeFileSync('server/workers/dynamic-bias-scorer.ts', scorer);
}

console.log('Fixed TS errors.');
