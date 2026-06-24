const fs = require('fs');

let pubDb = fs.readFileSync('server/publisher-bias-db.ts', 'utf8');
pubDb = pubDb.replace(
  /bias: "far_left" \| "left" \| "center_left" \| "center" \| "center_right" \| "right" \| "far_right";/g,
  'bias: "pro_establishment" | "pro_opposition" | "regional_aligned" | "neutral";'
);
pubDb = pubDb.replace(/bias: "far_left"/g, 'bias: "pro_opposition"');
pubDb = pubDb.replace(/bias: "left"/g, 'bias: "pro_opposition"');
pubDb = pubDb.replace(/bias: "center_left"/g, 'bias: "pro_opposition"');
pubDb = pubDb.replace(/bias: "center"/g, 'bias: "neutral"');
pubDb = pubDb.replace(/bias: "center_right"/g, 'bias: "pro_establishment"');
pubDb = pubDb.replace(/bias: "right"/g, 'bias: "pro_establishment"');
pubDb = pubDb.replace(/bias: "far_right"/g, 'bias: "pro_establishment"');
fs.writeFileSync('server/publisher-bias-db.ts', pubDb);

let seed = fs.readFileSync('server/seed.ts', 'utf8');
seed = seed.replace(/bias: "right" as const/g, 'bias: "pro_establishment" as const');
seed = seed.replace(/bias: "left" as const/g, 'bias: "pro_opposition" as const');
seed = seed.replace(/bias: "center" as const/g, 'bias: "neutral" as const');
fs.writeFileSync('server/seed.ts', seed);

console.log('Done replacing');
