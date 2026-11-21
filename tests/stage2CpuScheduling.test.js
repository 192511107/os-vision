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

describe('Stage 2 CPU Scheduling Module - Integration & Asset Tests', () => {
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

  test('GET /cpu-scheduling serves HTML with real editable inputs and controls', async () => {
    const res = await getRequest('/cpu-scheduling');
    assert.strictEqual(res.statusCode, 200);

    // Verify obsolete Stage 1 and wireframe texts are removed
    assert.strictEqual(res.body.includes('Stage 1 Foundation Active'), false, 'Should not contain "Stage 1 Foundation Active"');
    assert.strictEqual(res.body.includes('Stage 2 Wireframe'), false, 'Should not contain "Stage 2 Wireframe"');
    assert.strictEqual(res.body.includes('Interactive Gantt Canvas Wireframe'), false, 'Should not contain "Interactive Gantt Canvas Wireframe"');
    assert.strictEqual(res.body.includes('disabled-control-btn'), false, 'Should not have disabled mock control buttons');

    // Verify required inputs exist and are not disabled
    assert.ok(res.body.includes('id="inputPid"'), 'Missing inputPid');
    assert.ok(res.body.includes('id="inputArrival"'), 'Missing inputArrival');
    assert.ok(res.body.includes('id="inputBurst"'), 'Missing inputBurst');
    assert.ok(res.body.includes('id="inputPriority"'), 'Missing inputPriority');
    assert.ok(res.body.includes('id="timeQuantumInput"'), 'Missing timeQuantumInput');

    // Verify required buttons exist
    assert.ok(res.body.includes('id="addProcessBtn"'), 'Missing addProcessBtn');
    assert.ok(res.body.includes('id="clearProcessesBtn"'), 'Missing clearProcessesBtn');
    assert.ok(res.body.includes('id="resetProcessesBtn"'), 'Missing resetProcessesBtn');
    assert.ok(res.body.includes('id="runSimulationBtn"'), 'Missing runSimulationBtn');
    assert.ok(res.body.includes('id="loadSampleBtn"'), 'Missing loadSampleBtn');

    // Verify visualization and metrics elements
    assert.ok(res.body.includes('id="ganttChartCanvas"'), 'Missing ganttChartCanvas');
    assert.ok(res.body.includes('id="ganttTimelineMarkers"'), 'Missing ganttTimelineMarkers');
    assert.ok(res.body.includes('id="ganttLegend"'), 'Missing ganttLegend');
    assert.ok(res.body.includes('id="processTableBody"'), 'Missing processTableBody');
    assert.ok(res.body.includes('id="resultsTableBody"'), 'Missing resultsTableBody');
    assert.ok(res.body.includes('id="metricAvgTat"'), 'Missing metricAvgTat');
    assert.ok(res.body.includes('id="metricAvgWt"'), 'Missing metricAvgWt');
    assert.ok(res.body.includes('id="metricAvgRt"'), 'Missing metricAvgRt');
    assert.ok(res.body.includes('id="metricCpuUtil"'), 'Missing metricCpuUtil');

    // Verify script inclusion
    assert.ok(res.body.includes('/js/cpu-scheduling.js'), 'Must include cpu-scheduling.js script');
  });

  test('GET /js/cpu-scheduling.js serves the interactive frontend script', async () => {
    const res = await getRequest('/js/cpu-scheduling.js');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('runSimulation'), 'Script should contain runSimulation');
    assert.ok(res.body.includes('renderGanttChart'), 'Script should contain renderGanttChart');
    assert.ok(res.body.includes('clearAllProcesses'), 'Script should contain clearAllProcesses');
    assert.ok(res.body.includes('loadScenario'), 'Script should contain loadScenario');
  });

  test('Simulation API works across all 5 algorithms: FCFS, SJF, SRTF, RR, Priority', async () => {
    const testProcesses = [
      { pid: 'P1', arrivalTime: 0, burstTime: 6, priority: 2 },
      { pid: 'P2', arrivalTime: 2, burstTime: 4, priority: 1 },
      { pid: 'P3', arrivalTime: 4, burstTime: 2, priority: 3 }
    ];

    const algorithms = [
      { name: 'fcfs' },
      { name: 'sjf' },
      { name: 'srtf' },
      { name: 'rr', timeQuantum: 2 },
      { name: 'priority' }
    ];

    for (const algo of algorithms) {
      const res = await postRequest('/api/cpu-scheduling/simulate', {
        algorithm: algo.name,
        timeQuantum: algo.timeQuantum,
        processes: testProcesses
      });

      assert.strictEqual(res.statusCode, 200, `Simulation failed for ${algo.name}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.algorithm, algo.name);
      assert.ok(Array.isArray(res.body.gantt), 'Gantt chart array should be returned');
      assert.ok(res.body.gantt.length > 0, 'Gantt chart should have slices');
      assert.strictEqual(res.body.processResults.length, 3, 'Should have 3 process results');

      // Verify KPI metrics are calculated numbers
      assert.strictEqual(typeof res.body.metrics.avgTurnaroundTime, 'number');
      assert.strictEqual(typeof res.body.metrics.avgWaitingTime, 'number');
      assert.strictEqual(typeof res.body.metrics.avgResponseTime, 'number');
      assert.strictEqual(typeof res.body.metrics.cpuUtilization, 'number');
      assert.strictEqual(typeof res.body.metrics.throughput, 'number');
      assert.strictEqual(res.body.metrics.totalTime, 12);
      assert.strictEqual(res.body.metrics.idleTime, 0);
      assert.strictEqual(res.body.metrics.cpuUtilization, 100);
    }
  });

  test('Simulation API handles idle gap accurately', async () => {
    const idleProcs = [
      { pid: 'P1', arrivalTime: 0, burstTime: 3 },
      { pid: 'P2', arrivalTime: 8, burstTime: 4 }
    ];

    const res = await postRequest('/api/cpu-scheduling/simulate', {
      algorithm: 'fcfs',
      processes: idleProcs
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.metrics.totalTime, 12);
    assert.strictEqual(res.body.metrics.busyTime, 7);
    assert.strictEqual(res.body.metrics.idleTime, 5);

    const idleSlot = res.body.gantt.find(g => g.isIdle || g.pid === 'IDLE');
    assert.ok(idleSlot, 'Gantt chart must include IDLE slot');
    assert.strictEqual(idleSlot.start, 3);
    assert.strictEqual(idleSlot.end, 8);
    assert.strictEqual(idleSlot.duration, 5);
  });

  test('Adding P5 (arrival 0, burst 4) to process queue refreshes Gantt chart and simulation metrics', async () => {
    // Default process set + P5
    const processesWithP5 = [
      { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
      { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
      { pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 },
      { pid: 'P5', arrivalTime: 0, burstTime: 4, priority: 1 }
    ];

    const res = await postRequest('/api/cpu-scheduling/simulate', {
      algorithm: 'fcfs',
      processes: processesWithP5
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.metrics.totalProcesses, 5);
    assert.strictEqual(res.body.metrics.totalTime, 30);

    // Verify P5 appears in results
    const p5Result = res.body.processResults.find(p => p.pid === 'P5');
    assert.ok(p5Result, 'P5 must be included in process results');
    assert.strictEqual(p5Result.arrivalTime, 0);
    assert.strictEqual(p5Result.burstTime, 4);
    assert.strictEqual(p5Result.completionTime, 12);
    assert.strictEqual(p5Result.turnaroundTime, 12);
    assert.strictEqual(p5Result.waitingTime, 8);
    assert.strictEqual(p5Result.responseTime, 8);

    // Verify P5 appears in Gantt chart
    const p5Gantt = res.body.gantt.find(g => g.pid === 'P5');
    assert.ok(p5Gantt, 'P5 must appear in Gantt chart');
    assert.strictEqual(p5Gantt.start, 8);
    assert.strictEqual(p5Gantt.end, 12);
    assert.strictEqual(p5Gantt.duration, 4);
  });
});
