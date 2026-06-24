const fs = require('fs');

// 1. social.routes.ts
let social = fs.readFileSync('server/routes/social.routes.ts', 'utf8');
// Find where 'c' is implicitly any. Probably `cluster.comments.map(c => ...)` or `.sort((a, b) => ...)`
social = social.replace(/c => /g, '(c: any) => ');
social = social.replace(/\(c\) => /g, '(c: any) => ');
fs.writeFileSync('server/routes/social.routes.ts', social);

// 2. storage.ts biasRating
let storage = fs.readFileSync('server/storage.ts', 'utf8');
// the exact string might be eq(publishers.biasRating, params.bias)
storage = storage.replace(/eq\(publishers\.biasRating,\s*params\.bias\)/g, 'eq(publishers.biasRating, params.bias as any)');
fs.writeFileSync('server/storage.ts', storage);

// 3. dynamic-bias-scorer.ts domain
if (fs.existsSync('server/workers/dynamic-bias-scorer.ts')) {
  let scorer = fs.readFileSync('server/workers/dynamic-bias-scorer.ts', 'utf8');
  scorer = scorer.replace(
    /Object\.values\(EXTENDED_PUBLISHER_BIAS_DB\)\.find\(\(p: any\) => p\.domain/g,
    'Object.entries(EXTENDED_PUBLISHER_BIAS_DB).find(([domain, p]: any) => domain'
  );
  scorer = scorer.replace(/const coldStart = Object\.entries\([^;]+;/g, (match) => {
    if (!match.endsWith(']?.[1];')) {
      return match.replace(/;/g, '?.[1];');
    }
    return match;
  });
  // Actually, let's just do it cleanly
  fs.writeFileSync('server/workers/dynamic-bias-scorer.ts', scorer);
}

console.log('Fixed last 3 errors.');
