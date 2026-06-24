const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /\bleftCount\b/g, to: 'proEstablishmentCount' },
  { from: /\bcenterCount\b/g, to: 'neutralCount' },
  { from: /\brightCount\b/g, to: 'proOppositionCount' },
  { from: /\bleftPercent\b/g, to: 'proEstablishmentPercent' },
  { from: /\bcenterPercent\b/g, to: 'neutralPercent' },
  { from: /\brightPercent\b/g, to: 'proOppositionPercent' },
  { from: /\bbiasLabel3\b/g, to: 'biasLabel' },
  { from: /\bbiasLabel7\b/g, to: 'biasLabel' },
  { from: /\bbiasDistribution7\b/g, to: 'biasDistribution' },
  { from: /\bleft_count\b/g, to: 'pro_establishment_count' },
  { from: /\bcenter_count\b/g, to: 'neutral_count' },
  { from: /\bright_count\b/g, to: 'pro_opposition_count' },
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (!dirPath.includes('node_modules') && !dirPath.includes('.git') && !dirPath.includes('.gemini')) {
        walkDir(dirPath, callback);
      }
    } else {
      if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx') || dirPath.endsWith('.js') || dirPath.endsWith('.jsx')) {
        callback(dirPath);
      }
    }
  });
}

walkDir(process.cwd(), (filePath) => {
  if (filePath.includes('schema.ts') || filePath.includes('processing.ts')) return; // Already modified

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  replacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });

  if (content !== originalContent) {
    console.log(`Modified: ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
