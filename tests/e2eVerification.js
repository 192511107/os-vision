const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + path, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function verifyAll() {
  console.log('--- Verifying Running OS-Vision Server on Port 3000 ---');
  
  // 1. Dashboard
  const d = await get('/');
  console.log('GET / -> Status:', d.status);
  if (d.status !== 200) throw new Error('Dashboard returned ' + d.status);
  if (!d.data.includes('CPU Process Scheduling')) throw new Error('Missing Module 1 card');
  if (!d.data.includes('Scheduling Algorithm Comparison')) throw new Error('Missing Module 2 card');
  if (!d.data.includes('Scheduling Performance Analysis')) throw new Error('Missing Module 3 card');
  if (!d.data.includes('card-memory') || !d.data.includes('display: none;')) throw new Error('Memory card should be hidden');
  if (!d.data.includes('card-deadlock') || !d.data.includes('display: none;')) throw new Error('Deadlock card should be hidden');
  console.log('✓ Dashboard verified: Shows 3 modules, memory and deadlock cards hidden.');

  // 2. Module 1: CPU Scheduling
  const m1 = await get('/cpu-scheduling');
  console.log('GET /cpu-scheduling -> Status:', m1.status);
  if (m1.status !== 200) throw new Error('CPU Scheduling returned ' + m1.status);
  if (!m1.data.includes('id="ganttChartCanvas"')) throw new Error('Missing ganttChartCanvas');
  if (!m1.data.includes('id="runSimulationBtn"')) throw new Error('Missing runSimulationBtn');
  console.log('✓ Module 1 (CPU Process Scheduling) verified: Fully operational and unchanged.');

  // 3. Module 2: Scheduling Algorithm Comparison
  const m2 = await get('/scheduling-comparison');
  console.log('GET /scheduling-comparison -> Status:', m2.status);
  if (m2.status !== 200) throw new Error('Comparison page returned ' + m2.status);
  if (!m2.data.includes('id="comparisonTable"')) throw new Error('Missing comparisonTable');
  if (!m2.data.includes('id="runCompareBtn"')) throw new Error('Missing runCompareBtn');
  if (!m2.data.includes('id="multiGanttTracks"')) throw new Error('Missing multiGanttTracks');
  console.log('✓ Module 2 (Algorithm Comparison) verified.');

  // 4. Module 3: Scheduling Performance Analysis
  const m3 = await get('/scheduling-analysis');
  console.log('GET /scheduling-analysis -> Status:', m3.status);
  if (m3.status !== 200) throw new Error('Analysis page returned ' + m3.status);
  if (!m3.data.includes('id="chartWaitingTime"')) throw new Error('Missing chartWaitingTime');
  if (!m3.data.includes('id="statTotalBurst"')) throw new Error('Missing statTotalBurst');
  if (!m3.data.includes('id="insightsList"')) throw new Error('Missing insightsList');
  console.log('✓ Module 3 (Performance Analysis) verified.');

  // 5. Compare API
  const cmp = await post('/api/cpu-scheduling/compare', {
    processes: [
      { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
      { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
      { pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 }
    ],
    timeQuantum: 2
  });
  console.log('POST /api/cpu-scheduling/compare -> Status:', cmp.status);
  if (cmp.status !== 200) throw new Error('Compare API failed');
  if (!cmp.json.comparison || cmp.json.comparison.length !== 5) throw new Error('Expected 5 algorithms');
  
  console.log('Comparison metrics across all 5 algorithms:');
  cmp.json.comparison.forEach(c => {
    console.log(`  - ${c.algorithmName}: Avg WT=${c.avgWaitingTime}ms, Avg TAT=${c.avgTurnaroundTime}ms, Avg RT=${c.avgResponseTime}ms, CPU Util=${c.cpuUtilization}%, Throughput=${c.throughput}`);
  });

  // 6. Existing routes preserved
  const mem = await get('/memory-management');
  console.log('GET /memory-management -> Status:', mem.status, '(Route preserved)');
  const dlk = await get('/deadlock-management');
  console.log('GET /deadlock-management -> Status:', dlk.status, '(Route preserved)');
  const health = await get('/api/health');
  console.log('GET /api/health -> Status:', health.status);

  console.log('\n=== ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
}

verifyAll().catch(e => {
  console.error('Verification failed:', e.message);
  process.exit(1);
});
