import { articleQueue, heavyTaskQueue, retroactiveMergeQueue, isRedisConnected, connection } from "../queue";

async function main() {
  console.log("Waiting for Redis to connect...");
  // Wait a few seconds for Redis connection
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  if (!isRedisConnected()) {
    console.error("Redis is not connected. Are you running inside demo mode?");
    process.exit(1);
  }

  const queues = [
    { name: "article-processing", queue: articleQueue },
    { name: "heavy-tasks", queue: heavyTaskQueue },
    { name: "retroactive-merge", queue: retroactiveMergeQueue }
  ];

  for (const q of queues) {
    try {
      const waiting = await q.queue.getWaitingCount();
      const active = await q.queue.getActiveCount();
      const delayed = await q.queue.getDelayedCount();
      const failed = await q.queue.getFailedCount();
      
      console.log(`Queue: ${q.name}`);
      console.log(`  Waiting:   ${waiting}`);
      console.log(`  Active:    ${active}`);
      console.log(`  Delayed:   ${delayed}`);
      console.log(`  Failed:    ${failed}`);
    } catch (e) {
      console.error(`Failed to get counts for ${q.name}:`, e);
    }
  }

  process.exit(0);
}

main();
