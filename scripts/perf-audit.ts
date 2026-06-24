import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000';
const ENDPOINTS = [
  { name: 'Health Check', url: '/api/health' },
  { name: 'Homepage (All)', url: '/api/homepage?category=all' },
  { name: 'Analytics (Sentiment)', url: '/api/analytics/sentiment/politics' },
  { name: 'Analytics (Heatmap)', url: '/api/analytics/heat/world' },
  { name: 'Publishers List', url: '/api/publishers' },
];

async function runAudit() {
  console.log('🚀 Starting Performance Audit...\n');
  console.log('| Endpoint | Status | Response Time |\n| :--- | :---: | :--- |');

  for (const ep of ENDPOINTS) {
    const start = performance.now();
    try {
      const res = await axios.get(`${BASE_URL}${ep.url}`, { timeout: 10000 });
      const duration = (performance.now() - start).toFixed(2);
      console.log(`| ${ep.name} | ✅ ${res.status} | ${duration}ms |`);
    } catch (error: any) {
      const duration = (performance.now() - start).toFixed(2);
      console.log(`| ${ep.name} | ❌ ${error.response?.status || 'ERR'} | ${duration}ms |`);
    }
  }

  console.log('\n✅ Audit Complete.');
}

runAudit().catch(console.error);
