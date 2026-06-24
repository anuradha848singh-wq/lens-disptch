const fs = require('fs');

// 1. Fix use-auth imports
const replaceAuthImport = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/@\/hooks\/use-auth/g, '@/lib/auth-context');
  fs.writeFileSync(file, content);
};
replaceAuthImport('client/src/components/CommentsSection.tsx');
replaceAuthImport('client/src/components/CommunityRating.tsx');

// 2. Fix og.routes.ts ReactNode error
let og = fs.readFileSync('server/routes/og.routes.ts', 'utf8');
og = og.replace(/satori\(/g, 'satori( (');
og = og.replace(/, \{/g, ' as any), {');
fs.writeFileSync('server/routes/og.routes.ts', og);

// 3. Fix social.routes.ts implicit any
let social = fs.readFileSync('server/routes/social.routes.ts', 'utf8');
social = social.replace(/\(c\)/g, '(c: any)');
fs.writeFileSync('server/routes/social.routes.ts', social);

// 4. Fix server/storage.ts type mismatch
let storage = fs.readFileSync('server/storage.ts', 'utf8');
storage = storage.replace(/eq\(publishers.biasRating, params.bias\)/g, 'eq(publishers.biasRating, params.bias as any)');
fs.writeFileSync('server/storage.ts', storage);

// 5. Fix server/workers/dynamic-bias-scorer.ts
if (fs.existsSync('server/workers/dynamic-bias-scorer.ts')) {
  let scorer = fs.readFileSync('server/workers/dynamic-bias-scorer.ts', 'utf8');
  // It probably did PUBLISHER_BIAS_SEED.find... since EXTENDED_PUBLISHER_BIAS_DB is an object, we need Object.values
  scorer = scorer.replace(/EXTENDED_PUBLISHER_BIAS_DB\.find/g, 'Object.values(EXTENDED_PUBLISHER_BIAS_DB).find');
  fs.writeFileSync('server/workers/dynamic-bias-scorer.ts', scorer);
}

console.log('Fixed more errors.');
