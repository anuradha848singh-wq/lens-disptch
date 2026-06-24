async function run() {
  console.log('--- 3.1 Health endpoint ---');
  try {
    const res = await fetch('http://localhost:5000/api/health');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  console.log('\n--- 3.2 Homepage returns articles ---');
  try {
    const res = await fetch('http://localhost:5000/api/homepage?limit=5');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      console.log('Success: Received array of length', data.length);
      console.log('First cluster:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('FAIL: Expected array with at least 1 cluster, received:', JSON.stringify(data));
    }
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  console.log('\n--- 3.3 Categories exist ---');
  try {
    const res = await fetch('http://localhost:5000/api/categories');
    const data = await res.json();
    console.log('Categories count:', Array.isArray(data) ? data.length : 'not an array');
    console.log('Categories list:', data);
  } catch (e) {
    console.log('FAIL:', e.message);
  }
}

run();
