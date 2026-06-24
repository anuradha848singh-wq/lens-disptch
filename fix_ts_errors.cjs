const fs = require('fs');

function replaceInFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  let newContent = content;
  replacements.forEach(r => {
    newContent = newContent.replace(r.from, r.to);
  });
  if (newContent !== content) {
    fs.writeFileSync(path, newContent, 'utf8');
    console.log(`Fixed ${path}`);
  }
}

// 1. StoryCard.tsx
replaceInFile('client/src/components/StoryCard.tsx', [
  { from: /article\.bias === "left"/g, to: 'article.bias === "pro_establishment"' },
  { from: /article\.bias === "right"/g, to: 'article.bias === "pro_opposition"' },
  { from: /article\.bias === "center"/g, to: 'article.bias === "neutral"' }
]);

// 2. ArticleDetail.tsx
replaceInFile('client/src/pages/ArticleDetail.tsx', [
  { from: /article\.bias === "left"/g, to: 'article.bias === "pro_establishment"' },
  { from: /article\.bias === "right"/g, to: 'article.bias === "pro_opposition"' },
  { from: /article\.bias === "center"/g, to: 'article.bias === "neutral"' }
]);

// 3. EditorDashboard.tsx
replaceInFile('client/src/pages/EditorDashboard.tsx', [
  { from: /article\.bias === "left"/g, to: 'article.bias === "pro_establishment"' },
  { from: /article\.bias === "right"/g, to: 'article.bias === "pro_opposition"' },
  { from: /article\.bias === "center"/g, to: 'article.bias === "neutral"' }
]);

// 4. PublishersPage.tsx
replaceInFile('client/src/pages/PublishersPage.tsx', [
  { from: /"left"/g, to: '"pro_establishment"' },
  { from: /"right"/g, to: '"pro_opposition"' },
  { from: /"center"/g, to: '"neutral"' }
]);

// 5. server/storage.ts (Manual fixes for the specific lines)
let storage = fs.readFileSync('server/storage.ts', 'utf8');

// Fix UserProfile
storage = storage.replace(
  /avatarUrl: insertProfile\.avatarUrl \|\| null,\n\s*bio: insertProfile\.bio \|\| null,\n\s*updatedAt: new Date\(\),\n\s*\};/,
  `avatarUrl: insertProfile.avatarUrl || null,
      bio: insertProfile.bio || null,
      joinDate: new Date(),
      balanceScore: 50,
      isPublic: false,
      updatedAt: new Date(),
    };`
);

// Fix Publisher promoterGroup
storage = storage.replace(
  /ownerName: insertPublisher\.ownerName \|\| null,\n\s*ownerType: insertPublisher\.ownerType \|\| null,/,
  `ownerName: insertPublisher.ownerName || null,
      promoterGroup: insertPublisher.promoterGroup || null,
      ownerType: insertPublisher.ownerType || null,`
);

// Fix Cluster regionalAlignedCount
storage = storage.replace(
  /proOppositionCount: insertCluster\.proOppositionCount \|\| 0,\n\s*importanceScore: insertCluster\.importanceScore \?\? 0,/,
  `proOppositionCount: insertCluster.proOppositionCount || 0,
      regionalAlignedCount: insertCluster.regionalAlignedCount || 0,
      importanceScore: insertCluster.importanceScore ?? 0,`
);

// Fix MyBiasStats regionalAligned
storage = storage.replace(
  /proOppositionPercent: totalRead > 0 \? Math\.round\(\(proOppositionCount \/ totalRead\) \* 100\) : 0,\n\s*balanceScore/,
  `proOppositionPercent: totalRead > 0 ? Math.round((proOppositionCount / totalRead) * 100) : 0,
      regionalAlignedCount: 0,
      regionalAlignedPercent: 0,
      balanceScore`
);
storage = storage.replace(
  /proOppositionPercent: totalRead > 0 \? Math\.round\(\(proOppositionCount \/ totalRead\) \* 100\) : 0,\n\s*balanceScore/,
  `proOppositionPercent: totalRead > 0 ? Math.round((proOppositionCount / totalRead) * 100) : 0,
      regionalAlignedCount: 0,
      regionalAlignedPercent: 0,
      balanceScore`
);

// Fix 7-point to 4-point mapping in enrichArticle
storage = storage.replace(
  /\/\/ 1\. Derive 7-Point Label[\s\S]*?\/\/ 2\. Derive Simplified 3-Point Label \(for legacy UI support\)[\s\S]*?let biasLabel: "left" \| "center" \| "right" = "center";[\s\S]*?else if \(score > 15 \|\| pubRating\.includes\("right"\)\) biasLabel = "right";/,
  `// Simplified Bias Derivation
      let biasLabel: Bias = "neutral";
      if (score < -15 || pubRating.includes("pro_establishment")) biasLabel = "pro_establishment";
      else if (score > 15 || pubRating.includes("pro_opposition")) biasLabel = "pro_opposition";
      else if (pubRating.includes("regional_aligned")) biasLabel = "regional_aligned";`
);

storage = storage.replace(
  /bias: biasLabel, \/\/ Keep legacy field for compatibility\n\s*biasLabel,\n\s*biasLabel,/,
  `bias: biasLabel,`
);

fs.writeFileSync('server/storage.ts', storage, 'utf8');
console.log('Fixed server/storage.ts');

