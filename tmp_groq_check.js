require('dotenv').config();
const Redis = require('ioredis');

async function testGroq() {
  console.log('--- 6.1 Direct Groq API test ---');
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: 'Summarize in one sentence: India and Pakistan held peace talks today.'
        }]
      })
    });
    const d = await r.json();
    if (d.choices?.[0]?.message?.content) {
      console.log('PASS: Groq working');
      console.log('Response:', d.choices[0].message.content);
      console.log('Model:', d.model);
      console.log('Tokens used:', d.usage?.total_tokens);
    } else {
      console.log('FAIL:', JSON.stringify(d));
    }
  } catch (e) {
    console.log('FAIL:', e.message);
  }
}

async function testCache() {
  console.log('\n--- 6.2 Check Groq cache working (Redis) ---');
  const redis = new Redis(process.env.REDIS_URL);
  try {
    const keys = await redis.keys('groq:*');
    console.log('Cached Groq responses:', keys.length);
    console.log('Sample keys:', keys.slice(0, 3));
  } catch (e) {
    console.log('Redis check failed:', e.message);
  } finally {
    redis.disconnect();
  }
}

async function run() {
  await testGroq();
  await testCache();
}

run();
