const fs = require('fs');

let ad = fs.readFileSync('client/src/pages/ArticleDetail.tsx', 'utf8');
ad = ad.replaceAll('pubArt.bias === "left"', 'pubArt.bias === "pro_establishment"');
ad = ad.replaceAll('pubArt.bias === "right"', 'pubArt.bias === "pro_opposition"');
fs.writeFileSync('client/src/pages/ArticleDetail.tsx', ad);

let st = fs.readFileSync('server/storage.ts', 'utf8');

st = st.replaceAll(
  'avatarUrl: insertProfile.avatarUrl || null,\n      bio: insertProfile.bio || null,\n      updatedAt: new Date(),\n    };',
  'avatarUrl: insertProfile.avatarUrl || null,\n      bio: insertProfile.bio || null,\n      joinDate: new Date(),\n      balanceScore: 50,\n      isPublic: false,\n      updatedAt: new Date(),\n    };'
);

st = st.replaceAll(
  'ownerName: insertPublisher.ownerName || null,\n      ownerType: insertPublisher.ownerType || null,',
  'ownerName: insertPublisher.ownerName || null,\n      promoterGroup: insertPublisher.promoterGroup || null,\n      ownerType: insertPublisher.ownerType || null,'
);

st = st.replaceAll(
  'proOppositionCount: insertCluster.proOppositionCount || 0,\n      importanceScore: insertCluster.importanceScore ?? 0,',
  'proOppositionCount: insertCluster.proOppositionCount || 0,\n      regionalAlignedCount: insertCluster.regionalAlignedCount || 0,\n      importanceScore: insertCluster.importanceScore ?? 0,'
);

st = st.replaceAll(
  'proOppositionPercent: totalRead > 0 ? Math.round((proOppositionCount / totalRead) * 100) : 0,\n      alarmingPercent: totalRead > 0 ? Math.round((alarmingCount / totalRead) * 100) : 0,',
  'proOppositionPercent: totalRead > 0 ? Math.round((proOppositionCount / totalRead) * 100) : 0,\n      regionalAlignedCount: 0,\n      regionalAlignedPercent: 0,\n      alarmingPercent: totalRead > 0 ? Math.round((alarmingCount / totalRead) * 100) : 0,'
);

st = st.replaceAll(
  '// 1. Derive 7-Point Label\n      let biasLabel: Bias = "center";\n      if (score < -60) biasLabel = "far_left";\n      else if (score < -30) biasLabel = "left";\n      else if (score < -10) biasLabel = "center_left";\n      else if (score > 60) biasLabel = "far_right";\n      else if (score > 30) biasLabel = "right";\n      else if (score > 10) biasLabel = "center_right";\n      else {\n        // Fallback to publisher rating if score is near center\n        if (pubRating.includes("far left")) biasLabel = "far_left";\n        else if (pubRating.includes("far right")) biasLabel = "far_right";\n        else if (pubRating === "left") biasLabel = "left";\n        else if (pubRating === "right") biasLabel = "right";\n        else if (pubRating.includes("center-left")) biasLabel = "center_left";\n        else if (pubRating.includes("center-right")) biasLabel = "center_right";\n      }\n\n      // 2. Derive Simplified 3-Point Label (for legacy UI support)\n      let biasLabel: "left" | "center" | "right" = "center";\n      if (score < -15 || pubRating.includes("left")) biasLabel = "left";\n      else if (score > 15 || pubRating.includes("right")) biasLabel = "right";',
  'let biasLabel: Bias = "neutral";\n      if (score < -15 || pubRating.includes("pro_establishment")) biasLabel = "pro_establishment";\n      else if (score > 15 || pubRating.includes("pro_opposition")) biasLabel = "pro_opposition";\n      else if (pubRating.includes("regional_aligned")) biasLabel = "regional_aligned";'
);

st = st.replaceAll(
  'bias: biasLabel, // Keep legacy field for compatibility\n        biasLabel,\n        biasLabel,\n        sourceCount',
  'bias: biasLabel, // Keep legacy field for compatibility\n        biasLabel,\n        sourceCount'
);

fs.writeFileSync('server/storage.ts', st);
console.log('Fixed storage.ts and ArticleDetail.tsx');
