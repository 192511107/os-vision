const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const {
  validateAllocationInput,
  allocateMemory,
  validatePageReplacementInput,
  simulateFIFO,
  simulateLRU,
  simulateOptimal,
  simulatePageReplacement,
  getMemorySampleScenarios
} = require('../src/services/memoryManager');

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
        const isJson = res.headers['content-type'] && res.headers['content-type'].includes('application/json');
        let parsedBody = body;
        if (isJson && body) {
          try {
            parsedBody = JSON.parse(body);
          } catch (_) {
            parsedBody = body;
          }
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsedBody
        });
      });
    }).on('error', reject);
  });
}

describe('Memory Allocation - Input Validation', () => {
  test('rejects empty or non-object payloads', () => {
    assert.strictEqual(validateAllocationInput(null).valid, false);
    assert.strictEqual(validateAllocationInput('invalid').valid, false);
    assert.strictEqual(validateAllocationInput({}).valid, false);
  });

  test('rejects unsupported strategy', () => {
    const res = validateAllocationInput({
      strategy: 'random-fit',
      blocks: [100],
      processes: [{ pid: 'P1', size: 50 }]
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Invalid allocation strategy'));
  });

  test('rejects empty blocks or processes', () => {
    assert.strictEqual(validateAllocationInput({ strategy: 'first-fit', blocks: [], processes: [{ pid: 'P1', size: 50 }] }).valid, false);
    assert.strictEqual(validateAllocationInput({ strategy: 'first-fit', blocks: [100], processes: [] }).valid, false);
  });

  test('rejects duplicate process IDs', () => {
    const res = validateAllocationInput({
      strategy: 'first-fit',
      blocks: [200, 200],
      processes: [
        { pid: 'P1', size: 50 },
        { pid: 'p1', size: 60 }
      ]
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Duplicate Process ID'));
  });

  test('rejects non-positive sizes for blocks or processes', () => {
    assert.strictEqual(validateAllocationInput({
      strategy: 'first-fit',
      blocks: [0],
      processes: [{ pid: 'P1', size: 50 }]
    }).valid, false);

    assert.strictEqual(validateAllocationInput({
      strategy: 'first-fit',
      blocks: [100],
      processes: [{ pid: 'P1', size: -10 }]
    }).valid, false);
  });
});

describe('Memory Allocation Algorithms - Benchmark Scenarios', () => {
  const blocks = [
    { id: 'B1', size: 100 },
    { id: 'B2', size: 500 },
    { id: 'B3', size: 200 },
    { id: 'B4', size: 300 },
    { id: 'B5', size: 600 }
  ];

  const processes = [
    { pid: 'P1', size: 212 },
    { pid: 'P2', size: 417 },
    { pid: 'P3', size: 112 },
    { pid: 'P4', size: 426 }
  ];

  test('First-Fit allocates correctly and identifies unallocated process', () => {
    const res = allocateMemory({ strategy: 'first-fit', blocks, processes });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.strategy, 'first-fit');

    const p1 = res.processResults.find(p => p.pid === 'P1');
    const p2 = res.processResults.find(p => p.pid === 'P2');
    const p3 = res.processResults.find(p => p.pid === 'P3');
    const p4 = res.processResults.find(p => p.pid === 'P4');

    // First Fit allocation results:
    // P1 (212) -> B2 (500)
    assert.strictEqual(p1.allocated, true);
    assert.strictEqual(p1.blockId, 'B2');
    assert.strictEqual(p1.internalFrag, 288);

    // P2 (417) -> B5 (600)
    assert.strictEqual(p2.allocated, true);
    assert.strictEqual(p2.blockId, 'B5');
    assert.strictEqual(p2.internalFrag, 183);

    // P3 (112) -> B3 (200)
    assert.strictEqual(p3.allocated, true);
    assert.strictEqual(p3.blockId, 'B3');
    assert.strictEqual(p3.internalFrag, 88);

    // P4 (426) -> Not allocated (remaining blocks B1=100, B4=300 are too small)
    assert.strictEqual(p4.allocated, false);
    assert.strictEqual(p4.blockId, null);

    // External fragmentation should be 100 + 300 = 400
    assert.strictEqual(res.metrics.externalFragmentation, 400);
    assert.strictEqual(res.metrics.unallocatedProcessesCount, 1);
    assert.strictEqual(res.metrics.allocatedProcessesCount, 3);
  });

  test('Best-Fit successfully allocates all processes with minimal internal fragmentation', () => {
    const res = allocateMemory({ strategy: 'best-fit', blocks, processes });
    assert.strictEqual(res.success, true);

    const p1 = res.processResults.find(p => p.pid === 'P1');
    const p2 = res.processResults.find(p => p.pid === 'P2');
    const p3 = res.processResults.find(p => p.pid === 'P3');
    const p4 = res.processResults.find(p => p.pid === 'P4');

    // Best Fit:
    // P1 (212) -> B4 (300) [diff 88]
    assert.strictEqual(p1.allocated, true);
    assert.strictEqual(p1.blockId, 'B4');
    assert.strictEqual(p1.internalFrag, 88);

    // P2 (417) -> B2 (500) [diff 83]
    assert.strictEqual(p2.allocated, true);
    assert.strictEqual(p2.blockId, 'B2');
    assert.strictEqual(p2.internalFrag, 83);

    // P3 (112) -> B3 (200) [diff 88]
    assert.strictEqual(p3.allocated, true);
    assert.strictEqual(p3.blockId, 'B3');
    assert.strictEqual(p3.internalFrag, 88);

    // P4 (426) -> B5 (600) [diff 174]
    assert.strictEqual(p4.allocated, true);
    assert.strictEqual(p4.blockId, 'B5');
    assert.strictEqual(p4.internalFrag, 174);

    assert.strictEqual(res.metrics.unallocatedProcessesCount, 0);
    assert.strictEqual(res.metrics.externalFragmentation, 0);
    assert.strictEqual(res.metrics.allocationRate, 100);
  });

  test('Worst-Fit leaves largest holes and fails P4', () => {
    const res = allocateMemory({ strategy: 'worst-fit', blocks, processes });
    assert.strictEqual(res.success, true);

    const p1 = res.processResults.find(p => p.pid === 'P1');
    const p2 = res.processResults.find(p => p.pid === 'P2');
    const p3 = res.processResults.find(p => p.pid === 'P3');
    const p4 = res.processResults.find(p => p.pid === 'P4');

    // Worst Fit:
    // P1 (212) -> B5 (600) [max diff 388]
    assert.strictEqual(p1.allocated, true);
    assert.strictEqual(p1.blockId, 'B5');

    // P2 (417) -> B2 (500) [max diff 83]
    assert.strictEqual(p2.allocated, true);
    assert.strictEqual(p2.blockId, 'B2');

    // P3 (112) -> B4 (300) [max diff 188]
    assert.strictEqual(p3.allocated, true);
    assert.strictEqual(p3.blockId, 'B4');

    // P4 (426) -> Fails (remaining B1=100, B3=200)
    assert.strictEqual(p4.allocated, false);
    assert.strictEqual(res.metrics.externalFragmentation, 300);
  });
});

describe('Memory Allocation - Edge Cases', () => {
  test('A process larger than every available block fails to allocate', () => {
    const res = allocateMemory({
      strategy: 'first-fit',
      blocks: [100, 150, 200],
      processes: [{ pid: 'P_HUGE', size: 500 }]
    });

    assert.strictEqual(res.processResults[0].allocated, false);
    assert.strictEqual(res.metrics.externalFragmentation, 450);
    assert.strictEqual(res.metrics.allocationRate, 0);
  });

  test('Exact-fit memory blocks result in 0 internal fragmentation', () => {
    const res = allocateMemory({
      strategy: 'best-fit',
      blocks: [{ id: 'B1', size: 250 }, { id: 'B2', size: 100 }],
      processes: [{ pid: 'P1', size: 250 }, { pid: 'P2', size: 100 }]
    });

    assert.strictEqual(res.metrics.totalInternalFrag, 0);
    assert.strictEqual(res.metrics.allocationRate, 100);
    assert.strictEqual(res.processResults[0].internalFrag, 0);
    assert.strictEqual(res.processResults[1].internalFrag, 0);
  });

  test('Multiple processes competing for a single block', () => {
    const res = allocateMemory({
      strategy: 'first-fit',
      blocks: [200],
      processes: [{ pid: 'P1', size: 150 }, { pid: 'P2', size: 150 }]
    });

    assert.strictEqual(res.processResults[0].allocated, true);
    assert.strictEqual(res.processResults[1].allocated, false);
    assert.strictEqual(res.metrics.allocatedProcessesCount, 1);
    assert.strictEqual(res.metrics.unallocatedProcessesCount, 1);
  });
});

describe('Page Replacement - Input Validation', () => {
  test('rejects invalid algorithm or frames count', () => {
    assert.strictEqual(validatePageReplacementInput({ algorithm: 'random', referenceString: [1, 2], framesCount: 3 }).valid, false);
    assert.strictEqual(validatePageReplacementInput({ algorithm: 'fifo', referenceString: [1, 2], framesCount: 0 }).valid, false);
    assert.strictEqual(validatePageReplacementInput({ algorithm: 'fifo', referenceString: [1, 2], framesCount: -2 }).valid, false);
    assert.strictEqual(validatePageReplacementInput({ algorithm: 'fifo', referenceString: [], framesCount: 3 }).valid, false);
  });

  test('parses comma-separated string reference string correctly', () => {
    const res = validatePageReplacementInput({
      algorithm: 'lru',
      referenceString: '7, 0, 1, 2, 0, 3',
      framesCount: 3
    });
    assert.strictEqual(res.valid, true);
    assert.deepStrictEqual(res.sanitized.pages, [7, 0, 1, 2, 0, 3]);
  });
});

describe('Page Replacement Algorithms - Silberschatz Benchmark', () => {
  // Reference: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1 with 3 frames
  const pages = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
  const framesCount = 3;

  test('FIFO produces exactly 15 faults and 5 hits on 3 frames', () => {
    const res = simulateFIFO(pages, framesCount);
    assert.strictEqual(res.pageFaults, 15);
    assert.strictEqual(res.pageHits, 5);
    assert.strictEqual(res.steps.length, 20);
  });

  test('LRU produces exactly 12 faults and 8 hits on 3 frames', () => {
    const res = simulateLRU(pages, framesCount);
    assert.strictEqual(res.pageFaults, 12);
    assert.strictEqual(res.pageHits, 8);
    assert.strictEqual(res.steps.length, 20);
  });

  test('Optimal produces exactly 9 faults and 11 hits on 3 frames', () => {
    const res = simulateOptimal(pages, framesCount);
    assert.strictEqual(res.pageFaults, 9);
    assert.strictEqual(res.pageHits, 11);
    assert.strictEqual(res.steps.length, 20);
  });

  test("FIFO demonstrates Belady's Anomaly (3 frames = 9 faults, 4 frames = 10 faults)", () => {
    const beladySequence = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    const res3 = simulateFIFO(beladySequence, 3);
    const res4 = simulateFIFO(beladySequence, 4);

    assert.strictEqual(res3.pageFaults, 9);
    assert.strictEqual(res4.pageFaults, 10);
    assert.ok(res4.pageFaults > res3.pageFaults, "Belady's anomaly observed");
  });
});

describe('Page Replacement - Edge Cases', () => {
  test('Repeated identical page references yield 1 fault then all hits', () => {
    const res = simulatePageReplacement({
      algorithm: 'lru',
      referenceString: [2, 2, 2, 2, 2],
      framesCount: 3
    });
    assert.strictEqual(res.metrics.pageFaults, 1);
    assert.strictEqual(res.metrics.pageHits, 4);
    assert.strictEqual(res.metrics.hitRate, 80);
    assert.strictEqual(res.metrics.faultRate, 20);
  });

  test('Single frame (framesCount = 1) handles alternating pages correctly', () => {
    const res = simulatePageReplacement({
      algorithm: 'fifo',
      referenceString: [1, 2, 1, 2],
      framesCount: 1
    });
    assert.strictEqual(res.metrics.pageFaults, 4);
    assert.strictEqual(res.metrics.pageHits, 0);
  });

  test('More unique pages than available frames causes expected evictions', () => {
    const res = simulatePageReplacement({
      algorithm: 'lru',
      referenceString: [1, 2, 3, 4, 5],
      framesCount: 2
    });
    assert.strictEqual(res.metrics.pageFaults, 5);
    assert.strictEqual(res.metrics.pageHits, 0);
  });
});

describe('Memory Management API Endpoints', () => {
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

  test('POST /api/memory-management/allocate returns 200 with allocation data', async () => {
    const payload = {
      strategy: 'best-fit',
      blocks: [100, 200, 300],
      processes: [{ pid: 'P1', size: 150 }]
    };

    const res = await postRequest('/api/memory-management/allocate', payload);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.strategy, 'best-fit');
    assert.strictEqual(res.body.blocks.length, 3);
    assert.strictEqual(res.body.processResults[0].allocated, true);
    assert.strictEqual(res.body.processResults[0].blockId, 'B2');
  });

  test('POST /api/memory-management/allocate returns 400 for invalid strategy', async () => {
    const res = await postRequest('/api/memory-management/allocate', {
      strategy: 'bad-strategy',
      blocks: [100],
      processes: [{ pid: 'P1', size: 50 }]
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  test('POST /api/memory-management/page-replacement returns 200 with step matrix', async () => {
    const payload = {
      algorithm: 'optimal',
      referenceString: [7, 0, 1, 2, 0, 3],
      framesCount: 3
    };

    const res = await postRequest('/api/memory-management/page-replacement', payload);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.algorithm, 'optimal');
    assert.strictEqual(res.body.steps.length, 6);
    assert.ok(res.body.metrics.pageFaults > 0);
  });

  test('GET /api/memory-management/samples returns pre-configured scenarios', async () => {
    const res = await getRequest('/api/memory-management/samples');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.samples.allocation));
    assert.ok(Array.isArray(res.body.samples.pageReplacement));
    assert.ok(res.body.samples.allocation.length >= 3);
    assert.ok(res.body.samples.pageReplacement.length >= 3);
  });

  test('GET /memory-management serves complete Stage 3 interactive HTML with all controls', async () => {
    const res = await getRequest('/memory-management');
    assert.strictEqual(res.statusCode, 200);
    const html = res.body;

    // Must contain module title and all 6 algorithm names
    assert.ok(html.includes('Memory Management Simulator'));
    assert.ok(html.includes('First-Fit'));
    assert.ok(html.includes('Best-Fit'));
    assert.ok(html.includes('Worst-Fit'));
    assert.ok(html.includes('FIFO'));
    assert.ok(html.includes('LRU'));
    assert.ok(html.includes('Optimal'));

    // Must link the interactive JS script
    assert.ok(html.includes('/js/memory-management.js'));

    // Must contain allocation input and visualization IDs
    assert.ok(html.includes('id="allocationSection"'));
    assert.ok(html.includes('id="inputBlockSize"'));
    assert.ok(html.includes('id="addBlockBtn"'));
    assert.ok(html.includes('id="allocBlocksTableBody"'));
    assert.ok(html.includes('id="inputAllocPid"'));
    assert.ok(html.includes('id="inputAllocSize"'));
    assert.ok(html.includes('id="addAllocProcBtn"'));
    assert.ok(html.includes('id="allocProcessTableBody"'));
    assert.ok(html.includes('id="runAllocBtn"'));
    assert.ok(html.includes('id="resetAllocBtn"'));
    assert.ok(html.includes('id="clearAllocBtn"'));
    assert.ok(html.includes('id="memoryMapTrack"'));
    assert.ok(html.includes('id="allocResultsTableBody"'));
    assert.ok(html.includes('id="metricTotalMemory"'));
    assert.ok(html.includes('id="metricAllocatedMemory"'));
    assert.ok(html.includes('id="metricFreeMemory"'));
    assert.ok(html.includes('id="metricInternalFrag"'));
    assert.ok(html.includes('id="metricExternalFrag"'));
    assert.ok(html.includes('id="metricAllocRate"'));

    // Must contain page replacement input, playback, and matrix IDs
    assert.ok(html.includes('id="pageReplacementSection"'));
    assert.ok(html.includes('id="inputRefString"'));
    assert.ok(html.includes('id="inputFramesCount"'));
    assert.ok(html.includes('id="runPageSimBtn"'));
    assert.ok(html.includes('id="resetPageBtn"'));
    assert.ok(html.includes('id="clearPageBtn"'));
    assert.ok(html.includes('id="pagePlayBtn"'));
    assert.ok(html.includes('id="pagePrevBtn"'));
    assert.ok(html.includes('id="pageNextBtn"'));
    assert.ok(html.includes('id="pageResetStepBtn"'));
    assert.ok(html.includes('id="pageStepCounter"'));
    assert.ok(html.includes('id="pageSpeedSelect"'));
    assert.ok(html.includes('id="currentFramesLiveDisplay"'));
    assert.ok(html.includes('id="pageMatrixContainer"'));
    assert.ok(html.includes('id="metricTotalRefs"'));
    assert.ok(html.includes('id="metricPageFaults"'));
    assert.ok(html.includes('id="metricPageHits"'));
    assert.ok(html.includes('id="metricFaultRate"'));
    assert.ok(html.includes('id="metricHitRate"'));

    // Obsolete wireframe placeholder text must be gone
    assert.ok(!html.includes('Stage 1 Foundation Active'));
    assert.ok(!html.includes('Stage 3 Wireframe'));
    assert.ok(!html.includes('disabled-control-btn'));
  });
});

