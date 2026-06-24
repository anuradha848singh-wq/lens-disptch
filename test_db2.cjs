const { Client } = require('pg'); 
async function test() { 
  const client = new Client({connectionString: 'postgresql://admin:devpassword@localhost:5432/thelensdispatch'}); 
  await client.connect(); 
  const res = await client.query(`
    SELECT cluster_id, count(*), bool_or(visibility_state = 'visible') as has_visible 
    FROM articles 
    WHERE cluster_id IS NOT NULL 
    GROUP BY cluster_id 
    HAVING bool_or(visibility_state = 'visible')
  `); 
  console.log('Clusters with visible articles:', res.rowCount); 
  
  const res2 = await client.query(`
    SELECT id, source_count FROM clusters WHERE source_count >= 1
  `);
  console.log('Total valid clusters:', res2.rowCount);

  await client.end(); 
} 
test().catch(console.error);
