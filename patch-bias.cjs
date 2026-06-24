const fs = require('fs');

function patchFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Specific literal string replacements
  content = content.replace(/"center"/g, '"neutral"');
  content = content.replace(/'center'/g, "'neutral'");
  
  content = content.replace(/"left"/g, '"pro_opposition"');
  content = content.replace(/'left'/g, "'pro_opposition'");
  content = content.replace(/"far_left"/g, '"pro_opposition"');
  content = content.replace(/"center_left"/g, '"pro_opposition"');
  
  content = content.replace(/"right"/g, '"pro_establishment"');
  content = content.replace(/'right'/g, "'pro_establishment'");
  content = content.replace(/"far_right"/g, '"pro_establishment"');
  content = content.replace(/"center_right"/g, '"pro_establishment"');

  // Also replace in types: "left" | "center" | "right" etc
  
  fs.writeFileSync(filepath, content);
  console.log(`Patched ${filepath}`);
}

const files = [
  'server/processing.ts',
  'server/rss-sources.ts',
  'server/routes.ts',
  'server/news-fetcher.ts',
  'server/lib/groq-summarizer.ts',
  'server/lib/embeddings-client.ts',
  'server/seed-bias.ts',
  'server/routes/article.routes.ts',
  'server/routes/cluster.routes.ts',
  'server/quality-gate.ts'
];

files.forEach(patchFile);
