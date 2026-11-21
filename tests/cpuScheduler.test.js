const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  validateSchedulingInput,
  scheduleFCFS,
  scheduleSJF,
  scheduleSRTF,
  schedulePriority,
  scheduleRR,
  runScheduling,
  getSampleScenarios
} = require('../src/services/cpuScheduler');

describe('CPU Scheduling Engine - Input Validation', () => {
  test('rejects empty or non-object payloads', () => {
    assert.strictEqual(validateSchedulingInput(null).valid, false);
    assert.strictEqual(validateSchedulingInput('bad').valid, false);
    assert.strictEqual(validateSchedulingInput({}).valid, false);
  });

  test('rejects unsupported algorithm', () => {
    const res = validateSchedulingInput({
      algorithm: 'lottery',
      processes: [{ pid: 'P1', arrivalTime: 0, burstTime: 3 }]
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Invalid algorithm'));
  });

  test('rejects empty processes array', () => {
    const res = validateSchedulingInput({
      algorithm: 'fcfs',
      processes: []
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('At least one process'));
  });

  test('rejects duplicate process IDs', () => {
    const res = validateSchedulingInput({
      algorithm: 'fcfs',
      processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 2 },
        { pid: 'p1', arrivalTime: 1, burstTime: 3 }
      ]
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Duplicate Process ID'));
  });

  test('rejects negative arrival times', () => {
    const res = validateSchedulingInput({
      algorithm: 'fcfs',
      processes: [{ pid: 'P1', arrivalTime: -1, burstTime: 5 }]
    });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('arrival time'));
  });

  test('rejects zero or negative burst time', () => {
    const resZero = validateSchedulingInput({
      algorithm: 'fcfs',
      processes: [{ pid: 'P1', arrivalTime: 0, burstTime: 0 }]
    });
    assert.strictEqual(resZero.valid, false);
    assert.ok(resZero.error.includes('burst time'));

    const resNeg = validateSchedulingInput({
      algorithm: 'fcfs',
      processes: [{ pid: 'P1', arrivalTime: 0, burstTime: -4 }]
    });
    assert.strictEqual(resNeg.valid, false);
  });

  test('rejects non-positive time quantum for Round Robin', () => {
    const resZeroQ = validateSchedulingInput({
      algorithm: 'rr',
      timeQuantum: 0,
      processes: [{ pid: 'P1', arrivalTime: 0, burstTime: 4 }]
    });
    assert.strictEqual(resZeroQ.valid, false);
    assert.ok(resZeroQ.error.includes('positive time quantum'));

    const resNegQ = validateSchedulingInput({
      algorithm: 'rr',
      timeQuantum: -2,
      processes: [{ pid: 'P1', arrivalTime: 0, burstTime: 4 }]
    });
    assert.strictEqual(resNegQ.valid, false);

    const resMissingQ = validateSchedulingInput({
      algorithm: 'rr',
      processes: [{ pid: 'P1', arrivalTime: 0, burstTime: 4 }]
    });
    assert.strictEqual(resMissingQ.valid, false);
  });
});

describe('CPU Scheduling Engine - Edge Case: Single Process', () => {
  const singleProc = [{ pid: 'P1', arrivalTime: 0, burstTime: 5, priority: 1 }];

  test('FCFS single process', () => {
    const res = runScheduling({ algorithm: 'fcfs', processes: singleProc });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.gantt.length, 1);
    assert.deepStrictEqual(res.gantt[0], { pid: 'P1', isIdle: false, start: 0, end: 5, duration: 5 });

    const p = res.processResults[0];
    assert.strictEqual(p.completionTime, 5);
    assert.strictEqual(p.turnaroundTime, 5);
    assert.strictEqual(p.waitingTime, 0);
    assert.strictEqual(p.responseTime, 0);

    assert.strictEqual(res.metrics.cpuUtilization, 100);
    assert.strictEqual(res.metrics.throughput, 0.2);
    assert.strictEqual(res.metrics.idleTime, 0);
  });

  test('Round Robin single process with quantum 2', () => {
    const res = runScheduling({ algorithm: 'rr', timeQuantum: 2, processes: singleProc });
    assert.strictEqual(res.success, true);
    // Gantt will have 3 slices: [0-2], [2-4], [4-5]
    assert.strictEqual(res.gantt.length, 3);
    assert.strictEqual(res.processResults[0].completionTime, 5);
    assert.strictEqual(res.processResults[0].waitingTime, 0);
  });
});

describe('CPU Scheduling Engine - Edge Case: Processes arriving at t=0', () => {
  const procsAtZero = [
    { pid: 'P1', arrivalTime: 0, burstTime: 6 },
    { pid: 'P2', arrivalTime: 0, burstTime: 2 },
    { pid: 'P3', arrivalTime: 0, burstTime: 4 }
  ];

  test('FCFS processes at t=0 preserves input order', () => {
    const res = runScheduling({ algorithm: 'fcfs', processes: procsAtZero });
    assert.strictEqual(res.gantt.map(g => g.pid).join(','), 'P1,P2,P3');

    const [p1, p2, p3] = res.processResults;
    assert.strictEqual(p1.completionTime, 6);
    assert.strictEqual(p2.completionTime, 8);
    assert.strictEqual(p3.completionTime, 12);
    assert.strictEqual(res.metrics.avgTurnaroundTime, 8.67);
    assert.strictEqual(res.metrics.avgWaitingTime, 4.67);
  });

  test('SJF processes at t=0 executes shortest first (P2 -> P3 -> P1)', () => {
    const res = runScheduling({ algorithm: 'sjf', processes: procsAtZero });
    assert.strictEqual(res.gantt.map(g => g.pid).join(','), 'P2,P3,P1');

    const p1 = res.processResults.find(p => p.pid === 'P1');
    const p2 = res.processResults.find(p => p.pid === 'P2');
    const p3 = res.processResults.find(p => p.pid === 'P3');

    assert.strictEqual(p2.completionTime, 2);
    assert.strictEqual(p3.completionTime, 6);
    assert.strictEqual(p1.completionTime, 12);
    assert.strictEqual(res.metrics.avgTurnaroundTime, 6.67);
    assert.strictEqual(res.metrics.avgWaitingTime, 2.67);
  });
});

describe('CPU Scheduling Engine - Edge Case: CPU Idle Periods', () => {
  const idleGapProcs = [
    { pid: 'P1', arrivalTime: 0, burstTime: 2 },
    { pid: 'P2', arrivalTime: 5, burstTime: 3 }
  ];

  test('Correctly registers IDLE segment and computes idle/utilization metrics', () => {
    const res = runScheduling({ algorithm: 'fcfs', processes: idleGapProcs });
    assert.strictEqual(res.gantt.length, 3);
    assert.deepStrictEqual(res.gantt[0], { pid: 'P1', isIdle: false, start: 0, end: 2, duration: 2 });
    assert.deepStrictEqual(res.gantt[1], { pid: 'IDLE', isIdle: true, start: 2, end: 5, duration: 3 });
    assert.deepStrictEqual(res.gantt[2], { pid: 'P2', isIdle: false, start: 5, end: 8, duration: 3 });

    assert.strictEqual(res.metrics.totalTime, 8);
    assert.strictEqual(res.metrics.busyTime, 5);
    assert.strictEqual(res.metrics.idleTime, 3);
    assert.strictEqual(res.metrics.cpuUtilization, 62.5);
    assert.strictEqual(res.metrics.throughput, 0.25);
  });

  test('SJF handles initial idle period when min arrival > 0', () => {
    const delayedProcs = [
      { pid: 'P1', arrivalTime: 3, burstTime: 4 }
    ];
    const res = runScheduling({ algorithm: 'sjf', processes: delayedProcs });
    assert.strictEqual(res.gantt[0].pid, 'IDLE');
    assert.strictEqual(res.gantt[0].start, 0);
    assert.strictEqual(res.gantt[0].end, 3);
    assert.strictEqual(res.gantt[1].pid, 'P1');
    assert.strictEqual(res.gantt[1].start, 3);
    assert.strictEqual(res.gantt[1].end, 7);
  });
});

describe('CPU Scheduling Engine - Edge Case: Equal Burst Times and Priorities (Tie-Breaking)', () => {
  test('SJF tie-breaks equal burst times by arrival time, then input order', () => {
    const equalBursts = [
      { pid: 'P1', arrivalTime: 1, burstTime: 3 },
      { pid: 'P2', arrivalTime: 0, burstTime: 3 },
      { pid: 'P3', arrivalTime: 0, burstTime: 3 }
    ];
    const res = runScheduling({ algorithm: 'sjf', processes: equalBursts });
    // P2 and P3 arrive at 0 with equal burst, P2 comes first by originalIndex
    // Then P3 or P1? At t=3, both P1 and P3 have arrived with burst 3. P3 arrived at 0 so P3 goes next!
    assert.strictEqual(res.gantt[0].pid, 'P2');
    assert.strictEqual(res.gantt[1].pid, 'P3');
    assert.strictEqual(res.gantt[2].pid, 'P1');
  });

  test('Priority scheduling tie-breaks equal priorities by arrival, then index', () => {
    const prioProcs = [
      { pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 2 },
      { pid: 'P2', arrivalTime: 0, burstTime: 3, priority: 1 },
      { pid: 'P3', arrivalTime: 0, burstTime: 2, priority: 2 }
    ];
    const res = runScheduling({ algorithm: 'priority', processes: prioProcs });
    // P2 has priority 1 (highest). Then P1 and P3 have priority 2 (P1 arrived with earlier index).
    assert.strictEqual(res.gantt[0].pid, 'P2');
    assert.strictEqual(res.gantt[1].pid, 'P1');
    assert.strictEqual(res.gantt[2].pid, 'P3');
  });
});

describe('CPU Scheduling Engine - SRTF Preemption Verification', () => {
  const srtfSet = [
    { pid: 'P1', arrivalTime: 0, burstTime: 8 },
    { pid: 'P2', arrivalTime: 1, burstTime: 4 },
    { pid: 'P3', arrivalTime: 2, burstTime: 9 },
    { pid: 'P4', arrivalTime: 3, burstTime: 5 }
  ];

  test('Preempts running job when strictly shorter job arrives', () => {
    const res = runScheduling({ algorithm: 'srtf', processes: srtfSet });
    assert.strictEqual(res.success, true);

    const ganttPids = res.gantt.map(g => `${g.pid}[${g.start}-${g.end}]`).join(' ');
    assert.strictEqual(ganttPids, 'P1[0-1] P2[1-5] P4[5-10] P1[10-17] P3[17-26]');

    const p1 = res.processResults.find(p => p.pid === 'P1');
    const p2 = res.processResults.find(p => p.pid === 'P2');
    const p3 = res.processResults.find(p => p.pid === 'P3');
    const p4 = res.processResults.find(p => p.pid === 'P4');

    assert.strictEqual(p1.completionTime, 17);
    assert.strictEqual(p1.turnaroundTime, 17);
    assert.strictEqual(p1.waitingTime, 9);
    assert.strictEqual(p1.responseTime, 0);

    assert.strictEqual(p2.completionTime, 5);
    assert.strictEqual(p2.turnaroundTime, 4);
    assert.strictEqual(p2.waitingTime, 0);
    assert.strictEqual(p2.responseTime, 0);

    assert.strictEqual(p3.completionTime, 26);
    assert.strictEqual(p3.turnaroundTime, 24);
    assert.strictEqual(p3.waitingTime, 15);
    assert.strictEqual(p3.responseTime, 15);

    assert.strictEqual(p4.completionTime, 10);
    assert.strictEqual(p4.turnaroundTime, 7);
    assert.strictEqual(p4.waitingTime, 2);
    assert.strictEqual(p4.responseTime, 2);
  });
});

describe('CPU Scheduling Engine - Round Robin with Small Quantum', () => {
  const rrSet = [
    { pid: 'P1', arrivalTime: 0, burstTime: 5 },
    { pid: 'P2', arrivalTime: 1, burstTime: 3 },
    { pid: 'P3', arrivalTime: 2, burstTime: 1 }
  ];

  test('Round Robin Q=2 circular queue execution', () => {
    const res = runScheduling({ algorithm: 'rr', timeQuantum: 2, processes: rrSet });
    assert.strictEqual(res.success, true);

    const timeline = res.gantt.map(g => `${g.pid}[${g.start}-${g.end}]`).join(' ');
    assert.strictEqual(timeline, 'P1[0-2] P2[2-4] P3[4-5] P1[5-7] P2[7-8] P1[8-9]');

    const p1 = res.processResults.find(p => p.pid === 'P1');
    const p2 = res.processResults.find(p => p.pid === 'P2');
    const p3 = res.processResults.find(p => p.pid === 'P3');

    assert.strictEqual(p3.completionTime, 5);
    assert.strictEqual(p2.completionTime, 8);
    assert.strictEqual(p1.completionTime, 9);

    assert.strictEqual(p1.turnaroundTime, 9);
    assert.strictEqual(p1.waitingTime, 4);
    assert.strictEqual(p1.responseTime, 0);

    assert.strictEqual(p2.turnaroundTime, 7);
    assert.strictEqual(p2.waitingTime, 4);
    assert.strictEqual(p2.responseTime, 1);

    assert.strictEqual(p3.turnaroundTime, 3);
    assert.strictEqual(p3.waitingTime, 2);
    assert.strictEqual(p3.responseTime, 2);
  });

  test('Round Robin Q=1 small quantum fine slicing', () => {
    const res = runScheduling({
      algorithm: 'rr',
      timeQuantum: 1,
      processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 2 },
        { pid: 'P2', arrivalTime: 0, burstTime: 2 }
      ]
    });
    const order = res.gantt.map(g => g.pid).join(',');
    assert.strictEqual(order, 'P1,P2,P1,P2');
    assert.strictEqual(res.metrics.totalTime, 4);
    assert.strictEqual(res.metrics.cpuUtilization, 100);
  });
});

describe('CPU Scheduling Engine - Sample Scenarios Retrieval', () => {
  test('returns pre-configured sample datasets', () => {
    const samples = getSampleScenarios();
    assert.ok(Array.isArray(samples));
    assert.ok(samples.length >= 5);
    for (const sample of samples) {
      assert.ok(sample.id);
      assert.ok(sample.name);
      assert.ok(Array.isArray(sample.processes) && sample.processes.length > 0);
    }
  });
});
