const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');

let server;
let baseUrl;

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

function getRequest(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null
        });
      });
    }).on('error', reject);
  });
}

describe('CPU Scheduling API Endpoints', () => {
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

  test('POST /api/cpu-scheduling/simulate returns 200 and simulation results for valid payload', async () => {
    const payload = {
      algorithm: 'fcfs',
      processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 4 },
        { pid: 'P2', arrivalTime: 1, burstTime: 3 }
      ]
    };

    const res = await postRequest('/api/cpu-scheduling/simulate', payload);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.algorithm, 'fcfs');
    assert.ok(Array.isArray(res.body.gantt));
    assert.ok(Array.isArray(res.body.processResults));
    assert.strictEqual(res.body.metrics.totalProcesses, 2);
    assert.strictEqual(res.body.metrics.totalTime, 7);
  });

  test('POST /api/cpu-scheduling/simulate returns 400 for invalid algorithm', async () => {
    const payload = {
      algorithm: 'nonexistent',
      processes: [{ pid: 'P1', arrivalTime: 0, burstTime: 4 }]
    };

    const res = await postRequest('/api/cpu-scheduling/simulate', payload);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error);
  });

  test('POST /api/cpu-scheduling/simulate returns 400 for invalid processes (zero burst time)', async () => {
    const payload = {
      algorithm: 'sjf',
      processes: [{ pid: 'P1', arrivalTime: 0, burstTime: 0 }]
    };

    const res = await postRequest('/api/cpu-scheduling/simulate', payload);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('burst time'));
  });

  test('GET /api/cpu-scheduling/samples returns 200 with sample scenarios', async () => {
    const res = await getRequest('/api/cpu-scheduling/samples');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.samples));
    assert.ok(res.body.samples.length >= 5);
  });
});
