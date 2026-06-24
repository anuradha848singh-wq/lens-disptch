import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:5000/api/homepage?limit=5');
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

test().catch(console.error);
