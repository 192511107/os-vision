const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');

let server;
let baseUrl;

function request(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

describe('OS-Vision Server & Foundation Tests', () => {
  before(() => {
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`Test server running at ${baseUrl}`);
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });

  test('GET /api/health should return 200 and valid health telemetry', async () => {
    const res = await request('/api/health');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('application/json'));

    const json = JSON.parse(res.body);
    assert.strictEqual(json.status, 'healthy');
    assert.strictEqual(json.application, 'OS-Vision: Interactive OS Scheduling and Resource Management Simulator');
    assert.strictEqual(json.version, '1.0.0');
    assert.strictEqual(json.stage, 'Stage 1: Foundation');
    assert.ok(json.uptimeSeconds >= 0);
    assert.ok(json.modules.cpuScheduling);
    assert.ok(json.modules.memoryManagement);
    assert.ok(json.modules.deadlockManagement);
  });

  test('GET / should serve the dashboard HTML with title and modules', async () => {
    const res = await request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('OS-Vision'));
    assert.ok(res.body.includes('CPU Scheduling'));
    assert.ok(res.body.includes('Memory Management'));
    assert.ok(res.body.includes('Deadlock Management'));
  });

  test('GET /cpu-scheduling should serve the CPU Scheduling placeholder page', async () => {
    const res = await request('/cpu-scheduling');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('CPU Scheduling Simulator'));
    assert.ok(res.body.includes('First-Come, First-Served'));
  });

  test('GET /memory-management should serve the Memory Management placeholder page', async () => {
    const res = await request('/memory-management');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('Memory Management Simulator'));
    assert.ok(res.body.includes('First-Fit'));
  });

  test('GET /deadlock-management should serve the Deadlock Management placeholder page', async () => {
    const res = await request('/deadlock-management');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('Deadlock Management Simulator'));
    assert.ok(res.body.includes("Banker's Algorithm"));
  });

  test('GET /css/styles.css should serve the CSS design system', async () => {
    const res = await request('/css/styles.css');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('--bg-primary'));
  });

  test('GET /js/app.js should serve the client application logic', async () => {
    const res = await request('/js/app.js');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('checkServerHealth'));
  });

  test('GET /unknown-route-test should return 404', async () => {
    const res = await request('/unknown-route-test');
    assert.strictEqual(res.statusCode, 404);
  });
});
