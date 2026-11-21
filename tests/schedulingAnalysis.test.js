const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');

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

describe('Module 3: Scheduling Performance Analysis Tests', () => {
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

  test('GET /scheduling-analysis serves HTML with performance charts, stats, and insights', async () => {
    const res = await getRequest('/scheduling-analysis');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('Scheduling Performance Analysis'), 'Must include title');
    assert.ok(res.body.includes('id="chartWaitingTime"'), 'Must have chartWaitingTime');
    assert.ok(res.body.includes('id="chartTurnaroundTime"'), 'Must have chartTurnaroundTime');
    assert.ok(res.body.includes('id="chartResponseTime"'), 'Must have chartResponseTime');
    assert.ok(res.body.includes('id="chartCpuUtil"'), 'Must have chartCpuUtil');
    assert.ok(res.body.includes('id="statTotalBurst"'), 'Must have statTotalBurst');
    assert.ok(res.body.includes('id="statMakespan"'), 'Must have statMakespan');
    assert.ok(res.body.includes('id="statPreemptions"'), 'Must have statPreemptions');
    assert.ok(res.body.includes('id="statSpread"'), 'Must have statSpread');
    assert.ok(res.body.includes('id="insightsList"'), 'Must have insightsList');
    assert.ok(res.body.includes('id="recalculateBtn"'), 'Must have recalculateBtn');
    assert.ok(res.body.includes('/js/scheduling-analysis.js'), 'Must link scheduling-analysis.js');
  });

  test('GET /js/scheduling-analysis.js serves valid client script', async () => {
    const res = await getRequest('/js/scheduling-analysis.js');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('runAnalysis'));
    assert.ok(res.body.includes('renderAllCharts'));
    assert.ok(res.body.includes('renderExecutionStats'));
    assert.ok(res.body.includes('renderDynamicInsights'));
  });

  test('Execution statistics and comparison metrics are consistent on custom workloads', async () => {
    const workload = [
      { pid: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
      { pid: 'P2', arrivalTime: 2, burstTime: 3, priority: 1 },
      { pid: 'P3', arrivalTime: 4, burstTime: 1, priority: 3 }
    ];

    const res = await postRequest('/api/cpu-scheduling/compare', {
      processes: workload,
      timeQuantum: 2
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    const totalBurst = workload.reduce((acc, p) => acc + p.burstTime, 0);
    assert.strictEqual(totalBurst, 9);

    // Verify makespan equals total burst when no idle periods exist
    res.body.comparison.forEach(algo => {
      assert.strictEqual(algo.totalTime, 9, `Total time mismatch for ${algo.algorithmKey}`);
      assert.strictEqual(algo.idleTime, 0, `Idle time should be 0 for ${algo.algorithmKey}`);
      assert.strictEqual(algo.cpuUtilization, 100, `Utilization should be 100% for ${algo.algorithmKey}`);
    });
  });

  test('SRTF preemption is accurately measured when a shorter task arrives', async () => {
    // P1 (burst 7) runs from t=0. P2 (burst 2) arrives at t=1 -> SRTF preempts P1!
    const preemptionWorkload = [
      { pid: 'P1', arrivalTime: 0, burstTime: 7 },
      { pid: 'P2', arrivalTime: 1, burstTime: 2 }
    ];

    const res = await postRequest('/api/cpu-scheduling/compare', {
      processes: preemptionWorkload,
      timeQuantum: 2
    });

    assert.strictEqual(res.statusCode, 200);
    const srtf = res.body.comparison.find(c => c.algorithmKey === 'srtf');
    const sjf = res.body.comparison.find(c => c.algorithmKey === 'sjf');

    // SJF is non-preemptive: P1 completes at 7, then P2 completes at 9
    // SRTF is preemptive: P1 runs [0-1], P2 runs [1-3], P1 resumes [3-9] -> 3 slices!
    assert.strictEqual(srtf.sliceCount, 3);
    assert.strictEqual(srtf.contextSwitches, 2);
    assert.strictEqual(sjf.sliceCount, 2);
    assert.strictEqual(sjf.contextSwitches, 1);
  });
});
