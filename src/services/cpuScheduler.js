/**
 * OS-Vision: CPU Scheduling Engine
 * Pure algorithm implementations for FCFS, SJF, SRTF, Priority, and Round Robin.
 */

/**
 * Validates scheduling request input.
 * @param {Object} input
 * @returns {{ valid: boolean, error?: string, sanitized?: Object }}
 */
function validateSchedulingInput(input) {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object.' };
  }

  const { algorithm, processes, timeQuantum } = input;

  const validAlgorithms = ['fcfs', 'sjf', 'srtf', 'priority', 'rr'];
  if (!algorithm || typeof algorithm !== 'string' || !validAlgorithms.includes(algorithm.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid algorithm '${algorithm}'. Must be one of: ${validAlgorithms.join(', ')}.`
    };
  }

  const algo = algorithm.toLowerCase();

  if (algo === 'rr') {
    const tq = Number(timeQuantum);
    if (!Number.isFinite(tq) || tq <= 0) {
      return { valid: false, error: 'Round Robin requires a positive time quantum greater than zero.' };
    }
  }

  if (!Array.isArray(processes) || processes.length === 0) {
    return { valid: false, error: 'At least one process is required to run simulation.' };
  }

  const seenPids = new Set();
  const sanitizedProcesses = [];

  for (let i = 0; i < processes.length; i++) {
    const p = processes[i];
    if (!p || typeof p !== 'object') {
      return { valid: false, error: `Process at index ${i} is invalid.` };
    }

    const pid = String(p.pid || '').trim();
    if (!pid) {
      return { valid: false, error: `Process at index ${i} must have a non-empty Process ID (PID).` };
    }

    const lowerPid = pid.toLowerCase();
    if (seenPids.has(lowerPid)) {
      return { valid: false, error: `Duplicate Process ID '${pid}' detected. Process IDs must be unique.` };
    }
    seenPids.add(lowerPid);

    const arrivalTime = Number(p.arrivalTime);
    if (!Number.isFinite(arrivalTime) || arrivalTime < 0) {
      return { valid: false, error: `Process '${pid}' has invalid arrival time. Must be non-negative (>= 0).` };
    }

    const burstTime = Number(p.burstTime);
    if (!Number.isFinite(burstTime) || burstTime <= 0) {
      return { valid: false, error: `Process '${pid}' has invalid burst time. Must be greater than zero (> 0).` };
    }

    let priority = 1;
    if (p.priority !== undefined && p.priority !== null && p.priority !== '') {
      const parsedPriority = Number(p.priority);
      if (!Number.isFinite(parsedPriority)) {
        return { valid: false, error: `Process '${pid}' has invalid priority. Must be a finite number.` };
      }
      priority = parsedPriority;
    }

    sanitizedProcesses.push({
      pid,
      arrivalTime,
      burstTime,
      priority,
      originalIndex: i
    });
  }

  return {
    valid: true,
    sanitized: {
      algorithm: algo,
      processes: sanitizedProcesses,
      timeQuantum: algo === 'rr' ? Number(timeQuantum) : undefined
    }
  };
}

/**
 * First-Come, First-Served (FCFS) Scheduling (Non-preemptive)
 */
function scheduleFCFS(processes) {
  // Sort primarily by arrival time, secondarily by input order
  const procs = processes.map(p => ({ ...p })).sort((a, b) => {
    if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
    return a.originalIndex - b.originalIndex;
  });

  const gantt = [];
  let currentTime = 0;

  for (const p of procs) {
    if (currentTime < p.arrivalTime) {
      gantt.push({
        pid: 'IDLE',
        isIdle: true,
        start: currentTime,
        end: p.arrivalTime,
        duration: p.arrivalTime - currentTime
      });
      currentTime = p.arrivalTime;
    }

    const start = currentTime;
    const end = currentTime + p.burstTime;
    p.startTime = start;
    p.completionTime = end;

    gantt.push({
      pid: p.pid,
      isIdle: false,
      start,
      end,
      duration: p.burstTime
    });

    currentTime = end;
  }

  return { procs, gantt };
}

/**
 * Shortest Job First (SJF) Scheduling (Non-preemptive)
 */
function scheduleSJF(processes) {
  const procs = processes.map(p => ({ ...p, completed: false }));
  const gantt = [];
  let currentTime = 0;
  let completedCount = 0;
  const n = procs.length;

  while (completedCount < n) {
    // Ready processes at currentTime
    const available = procs.filter(p => !p.completed && p.arrivalTime <= currentTime);

    if (available.length === 0) {
      // Find next earliest arrival time among uncompleted
      const uncompleted = procs.filter(p => !p.completed);
      const nextArrival = Math.min(...uncompleted.map(p => p.arrivalTime));
      gantt.push({
        pid: 'IDLE',
        isIdle: true,
        start: currentTime,
        end: nextArrival,
        duration: nextArrival - currentTime
      });
      currentTime = nextArrival;
      continue;
    }

    // Select process with shortest burst time; tie-break with arrival time then index
    available.sort((a, b) => {
      if (a.burstTime !== b.burstTime) return a.burstTime - b.burstTime;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return a.originalIndex - b.originalIndex;
    });

    const chosen = available[0];
    const start = currentTime;
    const end = currentTime + chosen.burstTime;

    chosen.startTime = start;
    chosen.completionTime = end;
    chosen.completed = true;
    completedCount++;

    gantt.push({
      pid: chosen.pid,
      isIdle: false,
      start,
      end,
      duration: chosen.burstTime
    });

    currentTime = end;
  }

  return { procs, gantt };
}

/**
 * Shortest Remaining Time First (SRTF) Scheduling (Preemptive)
 */
function scheduleSRTF(processes) {
  const procs = processes.map(p => ({
    ...p,
    remainingTime: p.burstTime,
    startTime: null,
    completionTime: null
  }));

  const rawGantt = [];
  let currentTime = 0;
  let completedCount = 0;
  const n = procs.length;
  let runningProc = null;

  while (completedCount < n) {
    const ready = procs.filter(p => p.remainingTime > 0 && p.arrivalTime <= currentTime);

    if (ready.length === 0) {
      const uncompleted = procs.filter(p => p.remainingTime > 0);
      const nextArrival = Math.min(...uncompleted.map(p => p.arrivalTime));
      rawGantt.push({
        pid: 'IDLE',
        isIdle: true,
        start: currentTime,
        end: nextArrival,
        duration: nextArrival - currentTime
      });
      currentTime = nextArrival;
      runningProc = null;
      continue;
    }

    // Select shortest remaining time
    // If the currently running process is available and has remaining time equal to minimum, keep it
    ready.sort((a, b) => {
      if (a.remainingTime !== b.remainingTime) return a.remainingTime - b.remainingTime;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return a.originalIndex - b.originalIndex;
    });

    const minRemaining = ready[0].remainingTime;
    let chosen = ready[0];

    if (runningProc && runningProc.remainingTime === minRemaining && ready.some(p => p.pid === runningProc.pid)) {
      chosen = runningProc;
    }

    runningProc = chosen;

    if (chosen.startTime === null) {
      chosen.startTime = currentTime;
    }

    // Determine how long chosen runs before next potential preemption or completion
    const finishTime = currentTime + chosen.remainingTime;

    // Check if any process arrives before finishTime with strictly shorter burst than chosen's remaining
    let earliestPreemptTime = null;
    const unarrived = procs.filter(p => p.remainingTime > 0 && p.arrivalTime > currentTime && p.arrivalTime < finishTime);

    for (const upcoming of unarrived) {
      const chosenRemainingAtArrival = chosen.remainingTime - (upcoming.arrivalTime - currentTime);
      if (upcoming.burstTime < chosenRemainingAtArrival) {
        if (earliestPreemptTime === null || upcoming.arrivalTime < earliestPreemptTime) {
          earliestPreemptTime = upcoming.arrivalTime;
        }
      }
    }

    if (earliestPreemptTime !== null) {
      const runDuration = earliestPreemptTime - currentTime;
      rawGantt.push({
        pid: chosen.pid,
        isIdle: false,
        start: currentTime,
        end: earliestPreemptTime,
        duration: runDuration
      });
      chosen.remainingTime -= runDuration;
      currentTime = earliestPreemptTime;
    } else {
      const runDuration = chosen.remainingTime;
      rawGantt.push({
        pid: chosen.pid,
        isIdle: false,
        start: currentTime,
        end: finishTime,
        duration: runDuration
      });
      chosen.remainingTime = 0;
      chosen.completionTime = finishTime;
      currentTime = finishTime;
      completedCount++;
      runningProc = null;
    }
  }

  // Coalesce contiguous Gantt blocks with the same PID
  const gantt = coalesceGantt(rawGantt);
  return { procs, gantt };
}

/**
 * Priority Scheduling (Non-preemptive, lower number = higher priority)
 */
function schedulePriority(processes) {
  const procs = processes.map(p => ({ ...p, completed: false }));
  const gantt = [];
  let currentTime = 0;
  let completedCount = 0;
  const n = procs.length;

  while (completedCount < n) {
    const available = procs.filter(p => !p.completed && p.arrivalTime <= currentTime);

    if (available.length === 0) {
      const uncompleted = procs.filter(p => !p.completed);
      const nextArrival = Math.min(...uncompleted.map(p => p.arrivalTime));
      gantt.push({
        pid: 'IDLE',
        isIdle: true,
        start: currentTime,
        end: nextArrival,
        duration: nextArrival - currentTime
      });
      currentTime = nextArrival;
      continue;
    }

    // Lower numerical priority value = higher priority
    available.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return a.originalIndex - b.originalIndex;
    });

    const chosen = available[0];
    const start = currentTime;
    const end = currentTime + chosen.burstTime;

    chosen.startTime = start;
    chosen.completionTime = end;
    chosen.completed = true;
    completedCount++;

    gantt.push({
      pid: chosen.pid,
      isIdle: false,
      start,
      end,
      duration: chosen.burstTime
    });

    currentTime = end;
  }

  return { procs, gantt };
}

/**
 * Round Robin (RR) Scheduling (Preemptive with Time Quantum)
 */
function scheduleRR(processes, timeQuantum) {
  const q = Number(timeQuantum);
  const procs = processes.map(p => ({
    ...p,
    remainingTime: p.burstTime,
    startTime: null,
    completionTime: null,
    inQueue: false
  }));

  const gantt = [];
  const readyQueue = [];
  let currentTime = 0;
  let completedCount = 0;
  const n = procs.length;

  // Add all processes that arrive at t = 0
  const initialArrivals = procs
    .filter(p => p.arrivalTime <= currentTime)
    .sort((a, b) => {
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return a.originalIndex - b.originalIndex;
    });

  for (const p of initialArrivals) {
    p.inQueue = true;
    readyQueue.push(p);
  }

  while (completedCount < n) {
    if (readyQueue.length === 0) {
      // Find earliest uncompleted arrival
      const uncompleted = procs.filter(p => p.remainingTime > 0 && !p.inQueue);
      const nextArrival = Math.min(...uncompleted.map(p => p.arrivalTime));

      if (currentTime < nextArrival) {
        gantt.push({
          pid: 'IDLE',
          isIdle: true,
          start: currentTime,
          end: nextArrival,
          duration: nextArrival - currentTime
        });
        currentTime = nextArrival;
      }

      // Enqueue processes arriving at or before currentTime
      const newArrivals = procs
        .filter(p => p.remainingTime > 0 && !p.inQueue && p.arrivalTime <= currentTime)
        .sort((a, b) => {
          if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
          return a.originalIndex - b.originalIndex;
        });

      for (const p of newArrivals) {
        p.inQueue = true;
        readyQueue.push(p);
      }
    }

    const currentProc = readyQueue.shift();
    currentProc.inQueue = false;

    if (currentProc.startTime === null) {
      currentProc.startTime = currentTime;
    }

    const slice = Math.min(q, currentProc.remainingTime);
    const start = currentTime;
    const end = currentTime + slice;

    gantt.push({
      pid: currentProc.pid,
      isIdle: false,
      start,
      end,
      duration: slice
    });

    currentTime = end;
    currentProc.remainingTime -= slice;

    // Check for new arrivals strictly within (start, end]
    const arrivalsDuringSlice = procs
      .filter(p => p.remainingTime > 0 && !p.inQueue && p.pid !== currentProc.pid && p.arrivalTime > start && p.arrivalTime <= currentTime)
      .sort((a, b) => {
        if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
        return a.originalIndex - b.originalIndex;
      });

    for (const p of arrivalsDuringSlice) {
      p.inQueue = true;
      readyQueue.push(p);
    }

    if (currentProc.remainingTime === 0) {
      currentProc.completionTime = currentTime;
      completedCount++;
    } else {
      // Re-enqueue current process at the tail of ready queue
      currentProc.inQueue = true;
      readyQueue.push(currentProc);
    }
  }

  return { procs, gantt };
}

/**
 * Coalesce consecutive Gantt chart slices for the same process / idle state.
 */
function coalesceGantt(rawGantt) {
  if (!rawGantt || rawGantt.length === 0) return [];
  const merged = [];

  for (const block of rawGantt) {
    if (merged.length > 0 && merged[merged.length - 1].pid === block.pid) {
      const prev = merged[merged.length - 1];
      prev.end = block.end;
      prev.duration += block.duration;
    } else {
      merged.push({ ...block });
    }
  }

  return merged;
}

/**
 * Calculate per-process metrics and system-wide KPI metrics.
 */
function computeMetrics(procs, gantt) {
  const processResults = procs.map(p => {
    const completionTime = p.completionTime;
    const turnaroundTime = round(completionTime - p.arrivalTime, 2);
    const waitingTime = round(turnaroundTime - p.burstTime, 2);
    const responseTime = round(p.startTime - p.arrivalTime, 2);

    return {
      pid: p.pid,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      startTime: p.startTime,
      completionTime,
      turnaroundTime,
      waitingTime,
      responseTime,
      originalIndex: p.originalIndex
    };
  }).sort((a, b) => a.originalIndex - b.originalIndex);

  const n = processResults.length;
  const totalTurnaround = processResults.reduce((acc, p) => acc + p.turnaroundTime, 0);
  const totalWaiting = processResults.reduce((acc, p) => acc + p.waitingTime, 0);
  const totalResponse = processResults.reduce((acc, p) => acc + p.responseTime, 0);
  const totalBurst = processResults.reduce((acc, p) => acc + p.burstTime, 0);

  const maxCompletion = Math.max(...processResults.map(p => p.completionTime), 0);
  const totalSimulationTime = maxCompletion;
  const idleTime = Math.max(0, round(totalSimulationTime - totalBurst, 2));
  const cpuUtilization = totalSimulationTime > 0 ? round((totalBurst / totalSimulationTime) * 100, 2) : 100;
  const throughput = totalSimulationTime > 0 ? round(n / totalSimulationTime, 4) : 0;

  return {
    processResults,
    metrics: {
      totalProcesses: n,
      totalTime: totalSimulationTime,
      busyTime: totalBurst,
      idleTime,
      cpuUtilization,
      throughput,
      avgTurnaroundTime: round(totalTurnaround / n, 2),
      avgWaitingTime: round(totalWaiting / n, 2),
      avgResponseTime: round(totalResponse / n, 2)
    }
  };
}

/**
 * Helper to round to specified decimal places.
 */
function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Main dispatcher to run simulation.
 */
function runScheduling(input) {
  const validation = validateSchedulingInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { algorithm, processes, timeQuantum } = validation.sanitized;
  let result;
  let algorithmName = '';

  switch (algorithm) {
    case 'fcfs':
      result = scheduleFCFS(processes);
      algorithmName = 'First-Come, First-Served (FCFS)';
      break;
    case 'sjf':
      result = scheduleSJF(processes);
      algorithmName = 'Shortest Job First (SJF - Non-Preemptive)';
      break;
    case 'srtf':
      result = scheduleSRTF(processes);
      algorithmName = 'Shortest Remaining Time First (SRTF - Preemptive)';
      break;
    case 'priority':
      result = schedulePriority(processes);
      algorithmName = 'Priority Scheduling (Non-Preemptive)';
      break;
    case 'rr':
      result = scheduleRR(processes, timeQuantum);
      algorithmName = `Round Robin (RR - Time Quantum: ${timeQuantum})`;
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  const { processResults, metrics } = computeMetrics(result.procs, result.gantt);

  return {
    success: true,
    algorithm,
    algorithmName,
    timeQuantum: algorithm === 'rr' ? timeQuantum : null,
    gantt: result.gantt,
    processResults,
    metrics
  };
}

/**
 * Pre-defined sample process sets for user experimentation.
 */
function getSampleScenarios() {
  return [
    {
      id: 'standard-mix',
      name: 'Standard Mix (Silberschatz Demo)',
      description: 'Balanced set of 4 processes with staggered arrivals and varying burst times.',
      recommendedAlgorithm: 'fcfs',
      timeQuantum: 2,
      processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
        { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
        { pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
        { pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 }
      ]
    },
    {
      id: 'convoy-effect',
      name: 'Convoy Effect (FCFS Anomaly)',
      description: 'Long job arrives at t=0 followed by short tasks, highlighting the convoy latency.',
      recommendedAlgorithm: 'fcfs',
      timeQuantum: 3,
      processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 24, priority: 3 },
        { pid: 'P2', arrivalTime: 0, burstTime: 3, priority: 1 },
        { pid: 'P3', arrivalTime: 0, burstTime: 3, priority: 2 }
      ]
    },
    {
      id: 'srtf-preemption',
      name: 'SRTF Preemption Dynamic',
      description: 'Demonstrates aggressive preemption when shorter tasks arrive mid-execution.',
      recommendedAlgorithm: 'srtf',
      timeQuantum: 2,
      processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 7, priority: 2 },
        { pid: 'P2', arrivalTime: 2, burstTime: 4, priority: 1 },
        { pid: 'P3', arrivalTime: 4, burstTime: 1, priority: 3 },
        { pid: 'P4', arrivalTime: 5, burstTime: 4, priority: 2 }
      ]
    },
    {
      id: 'priority-dispatch',
      name: 'Priority Inversion / Order Demo',
      description: 'Processes with diverse priority levels (lower value indicates higher urgency).',
      recommendedAlgorithm: 'priority',
      timeQuantum: 2,
      processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 10, priority: 3 },
        { pid: 'P2', arrivalTime: 0, burstTime: 1, priority: 1 },
        { pid: 'P3', arrivalTime: 0, burstTime: 2, priority: 4 },
        { pid: 'P4', arrivalTime: 0, burstTime: 1, priority: 5 },
        { pid: 'P5', arrivalTime: 0, burstTime: 5, priority: 2 }
      ]
    },
    {
      id: 'round-robin-quantum',
      name: 'Round Robin Time-Slicing',
      description: 'Interactive fairness test highlighting circular queue dispatches with small quantum.',
      recommendedAlgorithm: 'rr',
      timeQuantum: 2,
      processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
        { pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
        { pid: 'P3', arrivalTime: 2, burstTime: 8, priority: 3 },
        { pid: 'P4', arrivalTime: 3, burstTime: 6, priority: 2 }
      ]
    },
    {
      id: 'idle-period-gap',
      name: 'CPU Idle Period (Staggered Gap)',
      description: 'Gap between process arrivals forcing CPU idle state tracking.',
      recommendedAlgorithm: 'sjf',
      timeQuantum: 2,
      processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 3, priority: 2 },
        { pid: 'P2', arrivalTime: 7, burstTime: 4, priority: 1 },
        { pid: 'P3', arrivalTime: 8, burstTime: 2, priority: 3 }
      ]
    }
  ];
}

module.exports = {
  validateSchedulingInput,
  scheduleFCFS,
  scheduleSJF,
  scheduleSRTF,
  schedulePriority,
  scheduleRR,
  coalesceGantt,
  computeMetrics,
  runScheduling,
  getSampleScenarios
};
