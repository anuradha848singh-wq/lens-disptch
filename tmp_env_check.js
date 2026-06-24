require('dotenv').config();
console.log('--- 2.1 Check all required env vars exist ---');
const required = [
  'DATABASE_URL',
  'REDIS_URL', 
  'SESSION_SECRET',
  'GROQ_API_KEY',
  'JINA_API_KEY',
];
required.forEach(key => {
  const val = process.env[key];
  const status = !val ? 'MISSING' : val.length < 5 ? 'EMPTY' : 'SET';
  console.log(key + ': ' + status);
});

console.log('\n--- 2.2 Verify REDIS_URL has password ---');
console.log('Has password:', process.env.REDIS_URL?.includes('redisdevpass'));
