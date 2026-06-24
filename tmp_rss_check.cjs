require('dotenv').config();
const { Queue } = require('bullmq');
const { Redis } = require('ioredis');

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
});

async function check() {
  console.log('--- 7.1 BullMQ queue status ---');
  const articleQ = new Queue('article-processing', { connection });
  const heavyQ = new Queue('heavy-tasks', { connection });
  
  const [ac, hc] = await Promise.all([
    articleQ.getJobCounts('waiting','active','completed','failed'),
    heavyQ.getJobCounts('waiting','active','completed','failed')
  ]);
  
  console.log('Article Queue:', JSON.stringify(ac));
  console.log('Heavy Queue:', JSON.stringify(hc));
  
  await connection.quit();
}

check().catch(e => {
  console.error(e);
  connection.disconnect();
});
