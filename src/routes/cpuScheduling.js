const express = require('express');
const router = express.Router();
const { runScheduling, getSampleScenarios, validateSchedulingInput } = require('../services/cpuScheduler');

/**
 * POST /api/cpu-scheduling/simulate
 * Simulates CPU scheduling for the requested algorithm and process set.
 */
router.post('/simulate', (req, res) => {
  try {
    const validation = validateSchedulingInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const result = runScheduling(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('[CPU Scheduling Simulation Error]:', err.message);
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to simulate CPU scheduling.'
    });
  }
});

/**
 * GET /api/cpu-scheduling/samples
 * Returns pre-configured sample process workloads for quick testing and demonstrations.
 */
router.get('/samples', (req, res) => {
  try {
    const samples = getSampleScenarios();
    res.status(200).json({
      success: true,
      samples
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve sample scenarios.'
    });
  }
});

/**
 * POST /api/cpu-scheduling/compare
 * Simulates all 5 scheduling algorithms (FCFS, SJF, SRTF, Priority, RR) for the same process workload.
 */
router.post('/compare', (req, res) => {
  try {
    const { processes, timeQuantum } = req.body;
    const tq = Number(timeQuantum) > 0 ? Number(timeQuantum) : 2;

    const algorithms = [
      { key: 'fcfs', name: 'First-Come, First-Served (FCFS)', type: 'Non-Preemptive' },
      { key: 'sjf', name: 'Shortest Job First (SJF)', type: 'Non-Preemptive' },
      { key: 'srtf', name: 'Shortest Remaining Time First (SRTF)', type: 'Preemptive' },
      { key: 'priority', name: 'Priority Scheduling', type: 'Non-Preemptive' },
      { key: 'rr', name: `Round Robin (RR, q=${tq})`, type: 'Preemptive' }
    ];

    const results = {};
    const comparison = [];

    for (const algo of algorithms) {
      const sim = runScheduling({
        algorithm: algo.key,
        processes,
        timeQuantum: algo.key === 'rr' ? tq : undefined
      });

      results[algo.key] = sim;
      comparison.push({
        algorithmKey: algo.key,
        algorithmName: algo.name,
        type: algo.type,
        avgWaitingTime: sim.metrics.avgWaitingTime,
        avgTurnaroundTime: sim.metrics.avgTurnaroundTime,
        avgResponseTime: sim.metrics.avgResponseTime,
        cpuUtilization: sim.metrics.cpuUtilization,
        throughput: sim.metrics.throughput,
        totalTime: sim.metrics.totalTime,
        idleTime: sim.metrics.idleTime,
        busyTime: sim.metrics.busyTime,
        sliceCount: sim.gantt.filter(g => !g.isIdle).length,
        contextSwitches: Math.max(0, sim.gantt.filter(g => !g.isIdle).length - 1)
      });
    }

    res.status(200).json({
      success: true,
      timeQuantum: tq,
      comparison,
      results
    });
  } catch (err) {
    console.error('[CPU Scheduling Comparison Error]:', err.message);
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to compare CPU scheduling algorithms.'
    });
  }
});

module.exports = router;

