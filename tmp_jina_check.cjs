require('dotenv').config();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getEmbedding(text) {
  const r = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.JINA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v2-base-en',
      input: [text]
    })
  });
  const d = await r.json();
  if (!d.data?.[0]?.embedding) {
    throw new Error('No embedding returned: ' + JSON.stringify(d));
  }
  return d.data[0].embedding;
}

function cosine(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]*b[i]; magA += a[i]*a[i]; magB += b[i]*b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function run() {
  console.log('--- 5.1 Direct Jina API test ---');
  try {
    const emb = await getEmbedding('Test article about Indian economy');
    console.log('PASS: Jina working');
    console.log('Dimensions:', emb.length);
    console.log('First 3 values:', emb.slice(0, 3));
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  console.log('\n--- 5.2 Semantic similarity test (Sequential to avoid concurrency limits) ---');
  try {
    // Run sequentially with 500ms gaps to respect free tier concurrency limit (2/2)
    const e1 = await getEmbedding('Modi visits Japan for bilateral talks');
    await delay(600);
    const e2 = await getEmbedding('PM lands in Tokyo for diplomatic meeting');
    await delay(600);
    const e3 = await getEmbedding('India cricket team wins test match');
    
    const sameSim = cosine(e1, e2);
    const diffSim = cosine(e1, e3);
    
    const samePass = sameSim > 0.85;
    const diffPass = diffSim < 0.7;
    const bothPass = samePass && diffPass;

    console.log('Same story similarity:', sameSim.toFixed(3), samePass ? 'PASS' : 'FAIL');
    console.log('Different story similarity:', diffSim.toFixed(3), diffPass ? 'PASS' : 'FAIL');
    console.log('Clustering will work:', bothPass ? 'YES' : 'NO');
  } catch (e) {
    console.log('FAIL similarity test:', e.message);
  }
}

run();
