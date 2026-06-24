const fs = require('fs');
const path = require('path');

const processingPath = path.join(__dirname, 'processing.ts');
const text = fs.readFileSync(processingPath, 'utf8');

const lines = text.split('\n');

function findFunction(name) {
  const ex = new RegExp(`(export )?(async )?function ${name}\\b`);
  let start = -1;
  let end = -1;
  let openBraces = 0;
  let inFunc = false;

  for (let i = 0; i < lines.length; i++) {
    if (!inFunc && ex.test(lines[i])) {
      start = i;
      inFunc = true;
    }
    if (inFunc) {
      const openM = lines[i].match(/\{/g);
      const closeM = lines[i].match(/\}/g);
      openBraces += (openM ? openM.length : 0);
      openBraces -= (closeM ? closeM.length : 0);
      if (openBraces === 0 && (openM || closeM)) {
        end = i;
        break;
      }
    }
  }
  return { start, end };
}

[
  "extractKeywords", "extractEntities", "extractTopicFingerprint", 
  "calculateWeightedEntitySimilarity", "generateShingles", "calculateShingleSimilarity", 
  "findCluster", "addArticleToClusterIndex", "retroactivelyMergeToCluster",
  "scoreArticle", "calculateMasterImportanceScore", "calculateShannonDiversity",
  "scoreWordCount", "scoreReadability", "biasLabelToScore", "determineVisibility",
  "fillCluster", "updateHomepageCache", "generateSmartSummary", 
  "updateClusterImportance", "updateClusterVelocity", "updateClusterAnalytics",
  "updatePublisherUniqueness"
].forEach(name => {
  const loc = findFunction(name);
  console.log(`${name}: ${loc.start} - ${loc.end}`);
});
