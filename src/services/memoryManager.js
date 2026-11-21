/**
 * OS-Vision: Memory Management Engine
 * Algorithms for Contiguous Memory Partition Allocation (First-Fit, Best-Fit, Worst-Fit)
 * and Virtual Memory Page Replacement (FIFO, LRU, Optimal).
 */

/**
 * Validates memory allocation input.
 * @param {Object} input
 * @returns {{ valid: boolean, error?: string, sanitized?: Object }}
 */
function validateAllocationInput(input) {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object.' };
  }

  const { strategy, blocks, processes } = input;

  const validStrategies = ['first-fit', 'best-fit', 'worst-fit'];
  if (!strategy || typeof strategy !== 'string' || !validStrategies.includes(strategy.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid allocation strategy '${strategy}'. Must be one of: ${validStrategies.join(', ')}.`
    };
  }

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { valid: false, error: 'At least one memory block is required.' };
  }

  if (!Array.isArray(processes) || processes.length === 0) {
    return { valid: false, error: 'At least one process is required for allocation.' };
  }

  const sanitizedBlocks = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    let size;
    let id;

    if (typeof b === 'number') {
      size = b;
      id = `B${i + 1}`;
    } else if (b && typeof b === 'object') {
      size = Number(b.size);
      id = b.id ? String(b.id).trim() : `B${i + 1}`;
    } else {
      return { valid: false, error: `Memory block at index ${i} is invalid.` };
    }

    if (!Number.isFinite(size) || size <= 0) {
      return { valid: false, error: `Block '${id}' must have a positive size greater than 0 KB.` };
    }

    sanitizedBlocks.push({
      id,
      size: Math.round(size),
      originalIndex: i
    });
  }

  const seenPids = new Set();
  const sanitizedProcesses = [];

  for (let i = 0; i < processes.length; i++) {
    const p = processes[i];
    let size;
    let pid;

    if (typeof p === 'number') {
      size = p;
      pid = `P${i + 1}`;
    } else if (p && typeof p === 'object') {
      size = Number(p.size);
      pid = p.pid ? String(p.pid).trim() : `P${i + 1}`;
    } else {
      return { valid: false, error: `Process at index ${i} is invalid.` };
    }

    if (!pid) {
      return { valid: false, error: `Process at index ${i} must have a valid Process ID.` };
    }

    const lowerPid = pid.toLowerCase();
    if (seenPids.has(lowerPid)) {
      return { valid: false, error: `Duplicate Process ID '${pid}' detected. Process IDs must be unique.` };
    }
    seenPids.add(lowerPid);

    if (!Number.isFinite(size) || size <= 0) {
      return { valid: false, error: `Process '${pid}' must have a positive memory size (> 0 KB).` };
    }

    sanitizedProcesses.push({
      pid,
      size: Math.round(size),
      originalIndex: i
    });
  }

  return {
    valid: true,
    sanitized: {
      strategy: strategy.toLowerCase(),
      blocks: sanitizedBlocks,
      processes: sanitizedProcesses
    }
  };
}

/**
 * Contiguous Memory Allocation Engine: First-Fit, Best-Fit, Worst-Fit.
 */
function allocateMemory(input) {
  const validation = validateAllocationInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { strategy, blocks, processes } = validation.sanitized;

  // Initialize block states
  let currentBase = 0;
  const blockStates = blocks.map(b => {
    const base = currentBase;
    currentBase += b.size;
    return {
      id: b.id,
      baseAddress: base,
      size: b.size,
      allocatedTo: null,
      processSize: null,
      internalFrag: 0,
      isAllocated: false,
      originalIndex: b.originalIndex
    };
  });

  const processResults = processes.map(p => ({
    pid: p.pid,
    size: p.size,
    allocated: false,
    blockId: null,
    baseAddress: null,
    internalFrag: null,
    originalIndex: p.originalIndex
  }));

  for (const proc of processResults) {
    let chosenBlock = null;

    if (strategy === 'first-fit') {
      // Find the first free block that is large enough
      for (const block of blockStates) {
        if (!block.isAllocated && block.size >= proc.size) {
          chosenBlock = block;
          break;
        }
      }
    } else if (strategy === 'best-fit') {
      // Find the free block that is large enough and has smallest leftover hole
      let minDiff = Infinity;
      for (const block of blockStates) {
        if (!block.isAllocated && block.size >= proc.size) {
          const diff = block.size - proc.size;
          if (diff < minDiff) {
            minDiff = diff;
            chosenBlock = block;
          }
        }
      }
    } else if (strategy === 'worst-fit') {
      // Find the free block with the maximum leftover hole
      let maxDiff = -1;
      for (const block of blockStates) {
        if (!block.isAllocated && block.size >= proc.size) {
          const diff = block.size - proc.size;
          if (diff > maxDiff) {
            maxDiff = diff;
            chosenBlock = block;
          }
        }
      }
    }

    if (chosenBlock) {
      chosenBlock.isAllocated = true;
      chosenBlock.allocatedTo = proc.pid;
      chosenBlock.processSize = proc.size;
      chosenBlock.internalFrag = chosenBlock.size - proc.size;

      proc.allocated = true;
      proc.blockId = chosenBlock.id;
      proc.baseAddress = chosenBlock.baseAddress;
      proc.internalFrag = chosenBlock.internalFrag;
    }
  }

  // Compute summary metrics
  const totalMemory = blockStates.reduce((acc, b) => acc + b.size, 0);
  const totalAllocated = processResults
    .filter(p => p.allocated)
    .reduce((acc, p) => acc + p.size, 0);
  const totalInternalFrag = blockStates
    .filter(b => b.isAllocated)
    .reduce((acc, b) => acc + b.internalFrag, 0);
  const totalFreeMemory = totalMemory - totalAllocated;

  const allocatedProcesses = processResults.filter(p => p.allocated);
  const unallocatedProcesses = processResults.filter(p => !p.allocated);

  // External fragmentation: sum of free blocks that cannot satisfy unallocated processes
  const freeBlocks = blockStates.filter(b => !b.isAllocated);
  const totalFreeBlocksMemory = freeBlocks.reduce((acc, b) => acc + b.size, 0);
  const externalFragmentation = unallocatedProcesses.length > 0 ? totalFreeBlocksMemory : 0;

  const allocationRate = processes.length > 0
    ? round((allocatedProcesses.length / processes.length) * 100, 2)
    : 0;
  const memoryUtilization = totalMemory > 0
    ? round((totalAllocated / totalMemory) * 100, 2)
    : 0;

  let strategyName = '';
  switch (strategy) {
    case 'first-fit': strategyName = 'First-Fit Allocation'; break;
    case 'best-fit': strategyName = 'Best-Fit Allocation'; break;
    case 'worst-fit': strategyName = 'Worst-Fit Allocation'; break;
  }

  return {
    success: true,
    strategy,
    strategyName,
    blocks: blockStates,
    processResults,
    metrics: {
      totalMemory,
      totalAllocated,
      totalFree: totalFreeMemory,
      totalInternalFrag,
      externalFragmentation,
      totalBlocks: blockStates.length,
      allocatedBlocksCount: blockStates.filter(b => b.isAllocated).length,
      freeBlocksCount: freeBlocks.length,
      totalProcesses: processes.length,
      allocatedProcessesCount: allocatedProcesses.length,
      unallocatedProcessesCount: unallocatedProcesses.length,
      allocationRate,
      memoryUtilization
    }
  };
}

/**
 * Validates page replacement input.
 */
function validatePageReplacementInput(input) {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object.' };
  }

  const { algorithm, referenceString, framesCount } = input;

  const validAlgorithms = ['fifo', 'lru', 'optimal', 'opt'];
  if (!algorithm || typeof algorithm !== 'string' || !validAlgorithms.includes(algorithm.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid page replacement algorithm '${algorithm}'. Must be one of: fifo, lru, optimal.`
    };
  }

  const algo = algorithm.toLowerCase() === 'opt' ? 'optimal' : algorithm.toLowerCase();

  const frames = Number(framesCount);
  if (!Number.isFinite(frames) || frames < 1 || !Number.isInteger(frames)) {
    return { valid: false, error: 'Number of frames must be an integer greater than or equal to 1.' };
  }

  let pages = [];
  if (Array.isArray(referenceString)) {
    pages = referenceString.map(p => Number(p));
  } else if (typeof referenceString === 'string') {
    pages = referenceString
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => Number(s));
  } else {
    return { valid: false, error: 'Page reference string must be an array of numbers or comma/space-separated string.' };
  }

  if (pages.length === 0) {
    return { valid: false, error: 'Page reference string must contain at least one page number.' };
  }

  for (let i = 0; i < pages.length; i++) {
    if (!Number.isFinite(pages[i]) || pages[i] < 0 || !Number.isInteger(pages[i])) {
      return { valid: false, error: `Invalid page reference '${pages[i]}' at position ${i + 1}. Pages must be non-negative integers.` };
    }
  }

  return {
    valid: true,
    sanitized: {
      algorithm: algo,
      pages,
      framesCount: frames
    }
  };
}

/**
 * FIFO (First In, First Out) Page Replacement
 */
function simulateFIFO(pages, framesCount) {
  const frames = new Array(framesCount).fill(null);
  const loadTimes = new Array(framesCount).fill(null);
  const steps = [];
  let pageFaults = 0;
  let pageHits = 0;

  for (let t = 0; t < pages.length; t++) {
    const page = pages[t];
    const hitIndex = frames.indexOf(page);

    if (hitIndex !== -1) {
      // HIT
      pageHits++;
      steps.push({
        step: t + 1,
        page,
        frames: [...frames],
        status: 'HIT',
        replacedPage: null,
        frameIndex: hitIndex
      });
    } else {
      // FAULT
      pageFaults++;
      const emptySlot = frames.indexOf(null);

      if (emptySlot !== -1) {
        frames[emptySlot] = page;
        loadTimes[emptySlot] = t;
        steps.push({
          step: t + 1,
          page,
          frames: [...frames],
          status: 'FAULT',
          replacedPage: null,
          frameIndex: emptySlot
        });
      } else {
        // Find oldest loaded frame
        let oldestIndex = 0;
        let minTime = loadTimes[0];
        for (let i = 1; i < framesCount; i++) {
          if (loadTimes[i] < minTime) {
            minTime = loadTimes[i];
            oldestIndex = i;
          }
        }

        const victim = frames[oldestIndex];
        frames[oldestIndex] = page;
        loadTimes[oldestIndex] = t;

        steps.push({
          step: t + 1,
          page,
          frames: [...frames],
          status: 'FAULT',
          replacedPage: victim,
          frameIndex: oldestIndex
        });
      }
    }
  }

  return { steps, pageFaults, pageHits };
}

/**
 * LRU (Least Recently Used) Page Replacement
 */
function simulateLRU(pages, framesCount) {
  const frames = new Array(framesCount).fill(null);
  const lastUsed = new Array(framesCount).fill(-1);
  const steps = [];
  let pageFaults = 0;
  let pageHits = 0;

  for (let t = 0; t < pages.length; t++) {
    const page = pages[t];
    const hitIndex = frames.indexOf(page);

    if (hitIndex !== -1) {
      // HIT
      pageHits++;
      lastUsed[hitIndex] = t;
      steps.push({
        step: t + 1,
        page,
        frames: [...frames],
        status: 'HIT',
        replacedPage: null,
        frameIndex: hitIndex
      });
    } else {
      // FAULT
      pageFaults++;
      const emptySlot = frames.indexOf(null);

      if (emptySlot !== -1) {
        frames[emptySlot] = page;
        lastUsed[emptySlot] = t;
        steps.push({
          step: t + 1,
          page,
          frames: [...frames],
          status: 'FAULT',
          replacedPage: null,
          frameIndex: emptySlot
        });
      } else {
        // Find frame with least recent usage timestamp
        let lruIndex = 0;
        let minTime = lastUsed[0];
        for (let i = 1; i < framesCount; i++) {
          if (lastUsed[i] < minTime) {
            minTime = lastUsed[i];
            lruIndex = i;
          }
        }

        const victim = frames[lruIndex];
        frames[lruIndex] = page;
        lastUsed[lruIndex] = t;

        steps.push({
          step: t + 1,
          page,
          frames: [...frames],
          status: 'FAULT',
          replacedPage: victim,
          frameIndex: lruIndex
        });
      }
    }
  }

  return { steps, pageFaults, pageHits };
}

/**
 * Optimal Page Replacement
 */
function simulateOptimal(pages, framesCount) {
  const frames = new Array(framesCount).fill(null);
  const loadTimes = new Array(framesCount).fill(null);
  const steps = [];
  let pageFaults = 0;
  let pageHits = 0;

  for (let t = 0; t < pages.length; t++) {
    const page = pages[t];
    const hitIndex = frames.indexOf(page);

    if (hitIndex !== -1) {
      // HIT
      pageHits++;
      steps.push({
        step: t + 1,
        page,
        frames: [...frames],
        status: 'HIT',
        replacedPage: null,
        frameIndex: hitIndex
      });
    } else {
      // FAULT
      pageFaults++;
      const emptySlot = frames.indexOf(null);

      if (emptySlot !== -1) {
        frames[emptySlot] = page;
        loadTimes[emptySlot] = t;
        steps.push({
          step: t + 1,
          page,
          frames: [...frames],
          status: 'FAULT',
          replacedPage: null,
          frameIndex: emptySlot
        });
      } else {
        // Optimal replacement: look forward in pages from t+1
        let replaceIndex = -1;
        let farthestDistance = -1;

        for (let f = 0; f < framesCount; f++) {
          const currentPage = frames[f];
          let nextOccurrence = Infinity;

          for (let future = t + 1; future < pages.length; future++) {
            if (pages[future] === currentPage) {
              nextOccurrence = future;
              break;
            }
          }

          if (nextOccurrence === Infinity) {
            // This page is never used again in future references
            replaceIndex = f;
            break;
          }

          if (nextOccurrence > farthestDistance) {
            farthestDistance = nextOccurrence;
            replaceIndex = f;
          }
        }

        const victim = frames[replaceIndex];
        frames[replaceIndex] = page;
        loadTimes[replaceIndex] = t;

        steps.push({
          step: t + 1,
          page,
          frames: [...frames],
          status: 'FAULT',
          replacedPage: victim,
          frameIndex: replaceIndex
        });
      }
    }
  }

  return { steps, pageFaults, pageHits };
}

/**
 * Main dispatcher for Page Replacement simulation.
 */
function simulatePageReplacement(input) {
  const validation = validatePageReplacementInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { algorithm, pages, framesCount } = validation.sanitized;
  let result;
  let algorithmName = '';

  switch (algorithm) {
    case 'fifo':
      result = simulateFIFO(pages, framesCount);
      algorithmName = 'First In, First Out (FIFO)';
      break;
    case 'lru':
      result = simulateLRU(pages, framesCount);
      algorithmName = 'Least Recently Used (LRU)';
      break;
    case 'optimal':
      result = simulateOptimal(pages, framesCount);
      algorithmName = 'Optimal Page Replacement (OPT)';
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  const totalReferences = pages.length;
  const faultRate = totalReferences > 0
    ? round((result.pageFaults / totalReferences) * 100, 2)
    : 0;
  const hitRate = totalReferences > 0
    ? round((result.pageHits / totalReferences) * 100, 2)
    : 0;

  return {
    success: true,
    algorithm,
    algorithmName,
    framesCount,
    referenceString: pages,
    steps: result.steps,
    metrics: {
      totalReferences,
      pageFaults: result.pageFaults,
      pageHits: result.pageHits,
      faultRate,
      hitRate,
      framesCount
    }
  };
}

/**
 * Pre-defined sample scenarios for user experimentation.
 */
function getMemorySampleScenarios() {
  return {
    allocation: [
      {
        id: 'silberschatz-standard',
        name: 'Silberschatz Contiguous Benchmark',
        description: 'Standard textbook problem with 5 partition blocks and 4 incoming processes.',
        strategy: 'first-fit',
        blocks: [
          { id: 'B1', size: 100 },
          { id: 'B2', size: 500 },
          { id: 'B3', size: 200 },
          { id: 'B4', size: 300 },
          { id: 'B5', size: 600 }
        ],
        processes: [
          { pid: 'P1', size: 212 },
          { pid: 'P2', size: 417 },
          { pid: 'P3', size: 112 },
          { pid: 'P4', size: 426 }
        ]
      },
      {
        id: 'external-fragmentation-stress',
        name: 'External Fragmentation Challenge',
        description: 'Small residual blocks that fail to accommodate a large process despite ample total free memory.',
        strategy: 'worst-fit',
        blocks: [
          { id: 'B1', size: 150 },
          { id: 'B2', size: 350 },
          { id: 'B3', size: 200 },
          { id: 'B4', size: 250 },
          { id: 'B5', size: 400 }
        ],
        processes: [
          { pid: 'P1', size: 300 },
          { pid: 'P2', size: 180 },
          { pid: 'P3', size: 220 },
          { pid: 'P4', size: 390 }
        ]
      },
      {
        id: 'exact-fit-mix',
        name: 'Exact Partitioning Fit',
        description: 'Multiple exact matches demonstrating optimal Best-Fit partition absorption without internal fragmentation.',
        strategy: 'best-fit',
        blocks: [
          { id: 'B1', size: 120 },
          { id: 'B2', size: 250 },
          { id: 'B3', size: 180 },
          { id: 'B4', size: 500 }
        ],
        processes: [
          { pid: 'P1', size: 250 },
          { pid: 'P2', size: 120 },
          { pid: 'P3', size: 180 },
          { pid: 'P4', size: 450 }
        ]
      }
    ],
    pageReplacement: [
      {
        id: 'silberschatz-lru-opt',
        name: 'Silberschatz Reference Sequence',
        description: 'Classic 20-page sequence comparing FIFO (15 faults), LRU (12 faults), and OPT (9 faults) on 3 frames.',
        algorithm: 'lru',
        framesCount: 3,
        referenceString: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
      },
      {
        id: 'belady-anomaly-demo',
        name: "Belady's Anomaly Test",
        description: "Known anomaly sequence where increasing FIFO frames from 3 to 4 increases page faults from 9 to 10.",
        algorithm: 'fifo',
        framesCount: 3,
        referenceString: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
      },
      {
        id: 'locality-loop',
        name: 'High Locality Loop',
        description: 'Repeated subset of pages demonstrating high hit ratios in LRU and Optimal algorithms.',
        algorithm: 'optimal',
        framesCount: 4,
        referenceString: [1, 2, 3, 4, 2, 1, 5, 6, 2, 1, 2, 3, 7, 6, 3, 2, 1, 2, 3, 6]
      }
    ]
  };
}

/**
 * Utility rounding function
 */
function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

module.exports = {
  validateAllocationInput,
  allocateMemory,
  validatePageReplacementInput,
  simulateFIFO,
  simulateLRU,
  simulateOptimal,
  simulatePageReplacement,
  getMemorySampleScenarios
};
