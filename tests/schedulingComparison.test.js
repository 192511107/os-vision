const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const { runScheduling } = require('../src/services/cpuScheduler');

let server;
let baseUrl;

function getRequest(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    }).on('error', reject);
  });
}

function postRequest(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const url = new URL(`${baseUrl}${path}`);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

describe('Module 2: Scheduling Algorithm Comparison Tests', () => {
  before(() => {
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });

  test('GET /scheduling-comparison serves HTML with comparison table and controls', async () => {
    const res = await getRequest('/scheduling-comparison');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('Scheduling Algorithm Comparison'), 'Must include title');
    assert.ok(res.body.includes('id="comparisonTable"'), 'Must have comparisonTable');
    assert.ok(res.body.includes('id="comparisonProcessTableBody"'), 'Must have comparisonProcessTableBody');
    assert.ok(res.body.includes('id="presetSelect"'), 'Must have presetSelect');
    assert.ok(res.body.includes('id="runCompareBtn"'), 'Must have runCompareBtn');
    assert.ok(res.body.includes('id="timeQuantumInput"'), 'Must have timeQuantumInput');
    assert.ok(res.body.includes('id="bestHighlightsGrid"'), 'Must have bestHighlightsGrid');
    assert.ok(res.body.includes('id="multiGanttTracks"'), 'Must have multiGanttTracks');
    assert.ok(res.body.includes('/js/scheduling-comparison.js'), 'Must link scheduling-comparison.js');
  });

  test('GET /js/scheduling-comparison.js serves valid client script', async () => {
    const res = await getRequest('/js/scheduling-comparison.js');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('runComparison'));
    assert.ok(res.body.includes('renderComparisonTable'));
    assert.ok(res.body.includes('renderMultiGantt'));
    assert.ok(res.body.includes('renderHighlights'));
  });

  test('POST /api/cpu-scheduling/compare runs simulation across all 5 algorithms and matches single engine output', async () => {
    const workload = [
      { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
      { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
      { pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 }
    ];

    const res = await postRequest('/api/cpu-scheduling/compare', {
      processes: workload,
      timeQuantum: 2
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.timeQuantum, 2);
    assert.ok(Array.isArray(res.body.comparison));
    assert.strictEqual(res.body.comparison.length, 5);

    // Verify all 5 algorithms are present
    const algoKeys = res.body.comparison.map(c => c.algorithmKey);
    assert.deepStrictEqual(algoKeys.sort(), ['fcfs', 'priority', 'rr', 'sjf', 'srtf'].sort());

    // Verify against individual runScheduling service output
    for (const algoKey of ['fcfs', 'sjf', 'srtf', 'priority', 'rr']) {
      const singleSim = runScheduling({
        algorithm: algoKey,
        processes: workload,
        timeQuantum: algoKey === 'rr' ? 2 : undefined
      });

      const compItem = res.body.comparison.find(c => c.algorithmKey === algoKey);
      assert.ok(compItem, `Comparison item for ${algoKey} must exist`);
      assert.strictEqual(compItem.avgWaitingTime, singleSim.metrics.avgWaitingTime, `WT mismatch for ${algoKey}`);
      assert.strictEqual(compItem.avgTurnaroundTime, singleSim.metrics.avgTurnaroundTime, `TAT mismatch for ${algoKey}`);
      assert.strictEqual(compItem.avgResponseTime, singleSim.metrics.avgResponseTime, `RT mismatch for ${algoKey}`);
      assert.strictEqual(compItem.cpuUtilization, singleSim.metrics.cpuUtilization, `Util mismatch for ${algoKey}`);
      assert.strictEqual(compItem.throughput, singleSim.metrics.throughput, `Throughput mismatch for ${algoKey}`);
      assert.strictEqual(compItem.totalTime, singleSim.metrics.totalTime, `Total time mismatch for ${algoKey}`);
    }
  });

  test('POST /api/cpu-scheduling/compare demonstrates Convoy Effect (FCFS vs SJF/SRTF)', async () => {
    // Convoy Effect: P1 long burst, P2 & P3 short bursts at t=0
    const convoyWorkload = [
      { pid: 'P1', arrivalTime: 0, burstTime: 24, priority: 3 },
      { pid: 'P2', arrivalTime: 0, burstTime: 3, priority: 1 },
      { pid: 'P3', arrivalTime: 0, burstTime: 3, priority: 2 }
    ];

    const res = await postRequest('/api/cpu-scheduling/compare', {
      processes: convoyWorkload,
      timeQuantum: 3
    });

    assert.strictEqual(res.statusCode, 200);
    const fcfs = res.body.comparison.find(c => c.algorithmKey === 'fcfs');
    const sjf = res.body.comparison.find(c => c.algorithmKey === 'sjf');

    // FCFS has high waiting time (P1=0, P2=24, P3=27 -> avg = 17)
    // SJF has low waiting time (P2=0, P3=3, P1=6 -> avg = 3)
    assert.strictEqual(fcfs.avgWaitingTime, 17);
    assert.strictEqual(sjf.avgWaitingTime, 3);
    assert.ok(fcfs.avgWaitingTime > sjf.avgWaitingTime, 'FCFS must have higher waiting time under convoy effect');
  });

  test('POST /api/cpu-scheduling/compare handles custom Round Robin quantum correctly', async () => {
    const workload = [
      { pid: 'P1', arrivalTime: 0, burstTime: 6 },
      { pid: 'P2', arrivalTime: 0, burstTime: 6 }
    ];

    // Q=1 should have 11 context switches
    const resQ1 = await postRequest('/api/cpu-scheduling/compare', {
      processes: workload,
      timeQuantum: 1
    });
    assert.strictEqual(resQ1.statusCode, 200);
    const rrQ1 = resQ1.body.comparison.find(c => c.algorithmKey === 'rr');
    assert.strictEqual(rrQ1.sliceCount, 12);
    assert.strictEqual(rrQ1.contextSwitches, 11);

    // Q=6 should have 1 context switch (P1 finishes, then P2)
    const resQ6 = await postRequest('/api/cpu-scheduling/compare', {
      processes: workload,
      timeQuantum: 6
    });
    assert.strictEqual(resQ6.statusCode, 200);
    const rrQ6 = resQ6.body.comparison.find(c => c.algorithmKey === 'rr');
    assert.strictEqual(rrQ6.sliceCount, 2);
    assert.strictEqual(rrQ6.contextSwitches, 1);
  });

  test('POST /api/cpu-scheduling/compare rejects invalid payload with 400', async () => {
    // Empty processes
    const res1 = await postRequest('/api/cpu-scheduling/compare', { processes: [] });
    assert.strictEqual(res1.statusCode, 400);
    assert.strictEqual(res1.body.success, false);

    // Invalid burst time
    const res2 = await postRequest('/api/cpu-scheduling/compare', {
      processes: [{ pid: 'P1', arrivalTime: 0, burstTime: -2 }]
    });
    assert.strictEqual(res2.statusCode, 400);
    assert.strictEqual(res2.body.success, false);
  });
});
