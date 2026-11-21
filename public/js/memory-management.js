/**
 * OS-Vision: Memory Management Module Interactivity & Simulation Visualizer
 * Stage 3 Complete Implementation:
 * - Contiguous Partition Allocation (First-Fit, Best-Fit, Worst-Fit)
 * - Virtual Memory Page Replacement (FIFO, LRU, Optimal)
 */

(function () {
  'use strict';

  // Active Mode: 'allocation' | 'pageReplacement'
  let currentMode = 'allocation';

  // ==========================================
  // STATE: Memory Allocation
  // ==========================================
  let currentAllocStrategy = 'first-fit';
  let blocks = [
    { id: 'B1', size: 100 },
    { id: 'B2', size: 500 },
    { id: 'B3', size: 200 },
    { id: 'B4', size: 300 },
    { id: 'B5', size: 600 }
  ];
  let allocProcesses = [
    { pid: 'P1', size: 212 },
    { pid: 'P2', size: 417 },
    { pid: 'P3', size: 112 },
    { pid: 'P4', size: 426 }
  ];
  let allocPresets = [];
  let lastAllocResult = null;

  // ==========================================
  // STATE: Page Replacement
  // ==========================================
  let currentPageAlgorithm = 'lru';
  let referencePages = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
  let framesCount = 3;
  let pagePresets = [];
  let lastPageResult = null;

  // Playback state
  let currentPlaybackStep = -1;
  let playbackTimer = null;
  let playbackSpeed = 800; // ms per step

  // Color mapping palette for processes
  const colorPalette = [
    { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: '#22d3ee', text: '#fff' }, // Cyan
    { bg: 'linear-gradient(135deg, #10b981, #059669)', border: '#34d399', text: '#fff' }, // Emerald
    { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#a78bfa', text: '#fff' }, // Purple
    { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#fbbf24', text: '#fff' }, // Amber
    { bg: 'linear-gradient(135deg, #ec4899, #db2777)', border: '#f472b6', text: '#fff' }, // Pink
    { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#60a5fa', text: '#fff' }, // Blue
    { bg: 'linear-gradient(135deg, #14b8a6, #0d9488)', border: '#2dd4bf', text: '#fff' }, // Teal
    { bg: 'linear-gradient(135deg, #f97316, #ea580c)', border: '#fb923c', text: '#fff' }  // Orange
  ];
  const processColorMap = new Map();

  function getProcessColor(pid) {
    if (!processColorMap.has(pid)) {
      const idx = processColorMap.size % colorPalette.length;
      processColorMap.set(pid, colorPalette[idx]);
    }
    return processColorMap.get(pid);
  }

  // ==========================================
  // DOM ELEMENT SELECTORS
  // ==========================================
  // Mode switcher
  const modeTabBtns = document.querySelectorAll('.mode-tab-btn');
  const allocSection = document.getElementById('allocationSection');
  const pageSection = document.getElementById('pageReplacementSection');

  // Error Alert Banner
  const memoryErrorAlert = document.getElementById('memoryErrorAlert');
  const memoryErrorAlertText = document.getElementById('memoryErrorAlertText');

  // --- Allocation Elements ---
  const allocAlgoTabs = document.querySelectorAll('.alloc-algo-tab');
  const allocAlgoInfoContainer = document.getElementById('allocAlgoInfoContainer');
  const allocPresetSelect = document.getElementById('allocPresetSelect');
  const loadAllocSampleBtn = document.getElementById('loadAllocSampleBtn');
  const runAllocBtn = document.getElementById('runAllocBtn');
  const clearAllocBtn = document.getElementById('clearAllocBtn');
  const resetAllocBtn = document.getElementById('resetAllocBtn');

  const inputBlockSize = document.getElementById('inputBlockSize');
  const addBlockBtn = document.getElementById('addBlockBtn');
  const allocBlocksTableBody = document.getElementById('allocBlocksTableBody');

  const inputAllocPid = document.getElementById('inputAllocPid');
  const inputAllocSize = document.getElementById('inputAllocSize');
  const addAllocProcBtn = document.getElementById('addAllocProcBtn');
  const allocProcessTableBody = document.getElementById('allocProcessTableBody');

  const memoryMapTrack = document.getElementById('memoryMapTrack');
  const allocResultsTableBody = document.getElementById('allocResultsTableBody');

  const metricTotalMemory = document.getElementById('metricTotalMemory');
  const metricAllocatedMemory = document.getElementById('metricAllocatedMemory');
  const metricFreeMemory = document.getElementById('metricFreeMemory');
  const metricInternalFrag = document.getElementById('metricInternalFrag');
  const metricExternalFrag = document.getElementById('metricExternalFrag');
  const metricAllocRate = document.getElementById('metricAllocRate');

  // --- Page Replacement Elements ---
  const pageAlgoTabs = document.querySelectorAll('.page-algo-tab');
  const pageAlgoInfoContainer = document.getElementById('pageAlgoInfoContainer');
  const pagePresetSelect = document.getElementById('pagePresetSelect');
  const loadPageSampleBtn = document.getElementById('loadPageSampleBtn');
  const runPageSimBtn = document.getElementById('runPageSimBtn');
  const clearPageBtn = document.getElementById('clearPageBtn');
  const resetPageBtn = document.getElementById('resetPageBtn');

  const inputRefString = document.getElementById('inputRefString');
  const inputFramesCount = document.getElementById('inputFramesCount');

  const pageMatrixContainer = document.getElementById('pageMatrixContainer');
  const currentFramesLiveDisplay = document.getElementById('currentFramesLiveDisplay');

  const metricTotalRefs = document.getElementById('metricTotalRefs');
  const metricPageFaults = document.getElementById('metricPageFaults');
  const metricPageHits = document.getElementById('metricPageHits');
  const metricFaultRate = document.getElementById('metricFaultRate');
  const metricHitRate = document.getElementById('metricHitRate');

  // Playback Controls
  const pagePlayBtn = document.getElementById('pagePlayBtn');
  const pagePrevBtn = document.getElementById('pagePrevBtn');
  const pageNextBtn = document.getElementById('pageNextBtn');
  const pageResetStepBtn = document.getElementById('pageResetStepBtn');
  const pageStepCounter = document.getElementById('pageStepCounter');
  const pageSpeedSelect = document.getElementById('pageSpeedSelect');

  // Descriptions for algorithm info banners
  const allocMeta = {
    'first-fit': {
      title: 'First-Fit Allocation Strategy',
      type: 'Contiguous Dynamic Partitioning',
      complexity: 'O(N)',
      summary: 'Scans memory partitions from the beginning and assigns the first free block large enough to accommodate the process. Fast to execute, though prone to external fragmentation near beginning addresses.'
    },
    'best-fit': {
      title: 'Best-Fit Allocation Strategy',
      type: 'Contiguous Dynamic Partitioning',
      complexity: 'O(N)',
      summary: 'Searches all free partitions and assigns the one with the smallest adequate capacity, minimizing internal fragmentation hole size per allocation.'
    },
    'worst-fit': {
      title: 'Worst-Fit Allocation Strategy',
      type: 'Contiguous Dynamic Partitioning',
      complexity: 'O(N)',
      summary: 'Assigns the process to the largest available memory partition, leaving behind the largest possible leftover hole which may remain useful for subsequent requests.'
    }
  };

  const pageMeta = {
    'fifo': {
      title: 'First In, First Out (FIFO) Page Replacement',
      type: 'Virtual Memory Management',
      complexity: 'O(1) queue shift',
      summary: 'Maintains a FIFO queue of active page frames. Replaces the oldest loaded page upon a fault. Simple to implement, but susceptible to Belady’s Anomaly.'
    },
    'lru': {
      title: 'Least Recently Used (LRU) Page Replacement',
      type: 'Virtual Memory Management',
      complexity: 'O(1) with stack / timestamps',
      summary: 'Tracks page reference timestamps and evicts the page that has not been accessed for the longest duration of past time. Approximates optimal replacement.'
    },
    'optimal': {
      title: 'Optimal (OPT) Page Replacement',
      type: 'Theoretical Benchmark',
      complexity: 'O(N * F) lookup',
      summary: 'Looks ahead into future references and evicts the page that will not be accessed for the longest duration of future time. Guarantees the theoretical minimum page fault count.'
    }
  };

  // ==========================================
  // INITIALIZATION
  // ==========================================
  async function init() {
    setupModeSwitcher();
    setupAllocControls();
    setupPageControls();
    renderBlocksTable();
    renderAllocProcessTable();
    await fetchPresets();
    runAllocationSimulation();
  }

  // --- Fetch Presets from Backend API ---
  async function fetchPresets() {
    try {
      const res = await fetch('/api/memory-management/samples');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.samples) {
          allocPresets = data.samples.allocation || [];
          pagePresets = data.samples.pageReplacement || [];
          populateAllocPresets(allocPresets);
          populatePagePresets(pagePresets);
        }
      }
    } catch (err) {
      console.warn('Could not load sample presets from API:', err);
    }
  }

  function populateAllocPresets(presets) {
    if (!allocPresetSelect) return;
    allocPresetSelect.innerHTML = '<option value="">-- Choose Allocation Benchmark --</option>';
    presets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.strategy.toUpperCase()})`;
      allocPresetSelect.appendChild(opt);
    });
  }

  function populatePagePresets(presets) {
    if (!pagePresetSelect) return;
    pagePresetSelect.innerHTML = '<option value="">-- Choose Page Reference Sequence --</option>';
    presets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.algorithm.toUpperCase()})`;
      pagePresetSelect.appendChild(opt);
    });
  }

  // ==========================================
  // MODE SWITCHER (ALLOCATION VS PAGE REPLACEMENT)
  // ==========================================
  function setupModeSwitcher() {
    modeTabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = btn.dataset.mode;
        if (mode === currentMode) return;

        modeTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = mode;

        hideError();

        if (mode === 'allocation') {
          if (allocSection) allocSection.style.display = 'block';
          if (pageSection) pageSection.style.display = 'none';
          stopPlayback();
          runAllocationSimulation();
        } else {
          if (allocSection) allocSection.style.display = 'none';
          if (pageSection) pageSection.style.display = 'block';
          runPageReplacementSimulation();
        }
      });
    });
  }

  // ==========================================
  // 1. MEMORY ALLOCATION LOGIC
  // ==========================================
  function setupAllocControls() {
    // Strategy tabs
    allocAlgoTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        allocAlgoTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentAllocStrategy = tab.dataset.strategy;
        updateAllocInfoView();
        hideError();
        runAllocationSimulation();
      });
    });

    // Add Block
    if (addBlockBtn && inputBlockSize) {
      addBlockBtn.addEventListener('click', () => {
        const size = Number(inputBlockSize.value);
        if (!Number.isFinite(size) || size <= 0) {
          showError('Memory block size must be greater than 0 KB.');
          inputBlockSize.focus();
          return;
        }

        const nextNum = blocks.length + 1;
        blocks.push({ id: `B${nextNum}`, size: Math.round(size) });
        inputBlockSize.value = '';
        renderBlocksTable();
        hideError();
        runAllocationSimulation();
        if (window.showToast) window.showToast(`Added Block B${nextNum} (${size} KB)`, 'success');
      });

      inputBlockSize.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addBlockBtn.click();
        }
      });
    }

    // Add Process
    if (addAllocProcBtn && inputAllocPid && inputAllocSize) {
      addAllocProcBtn.addEventListener('click', () => {
        const pid = String(inputAllocPid.value || '').trim();
        const size = Number(inputAllocSize.value);

        if (!pid) {
          showError('Please enter a Process ID (e.g. P1, P5).');
          inputAllocPid.focus();
          return;
        }

        const isDup = allocProcesses.some(p => p.pid.toLowerCase() === pid.toLowerCase());
        if (isDup) {
          showError(`Process ID '${pid}' already exists. Process IDs must be unique.`);
          inputAllocPid.focus();
          return;
        }

        if (!Number.isFinite(size) || size <= 0) {
          showError('Process requested memory size must be greater than 0 KB.');
          inputAllocSize.focus();
          return;
        }

        allocProcesses.push({ pid, size: Math.round(size) });
        inputAllocPid.value = '';
        inputAllocSize.value = '';
        renderAllocProcessTable();
        hideError();
        runAllocationSimulation();
        if (window.showToast) window.showToast(`Added process ${pid} (${size} KB)`, 'success');
      });

      [inputAllocPid, inputAllocSize].forEach(input => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addAllocProcBtn.click();
          }
        });
      });
    }

    // Preset selection
    if (allocPresetSelect) {
      allocPresetSelect.addEventListener('change', (e) => {
        const id = e.target.value;
        if (!id) return;
        const found = allocPresets.find(p => p.id === id);
        if (found) {
          blocks = JSON.parse(JSON.stringify(found.blocks));
          allocProcesses = JSON.parse(JSON.stringify(found.processes));
          currentAllocStrategy = found.strategy;

          allocAlgoTabs.forEach(tab => {
            if (tab.dataset.strategy === currentAllocStrategy) tab.classList.add('active');
            else tab.classList.remove('active');
          });

          updateAllocInfoView();
          renderBlocksTable();
          renderAllocProcessTable();
          hideError();
          runAllocationSimulation();
          if (window.showToast) window.showToast(`Loaded allocation preset: ${found.name}`, 'info');
        }
      });
    }

    if (loadAllocSampleBtn) {
      loadAllocSampleBtn.addEventListener('click', () => {
        let target = null;
        if (allocPresetSelect && allocPresetSelect.value) {
          target = allocPresets.find(p => p.id === allocPresetSelect.value);
        }
        if (!target && allocPresets.length > 0) {
          target = allocPresets[0];
          if (allocPresetSelect) allocPresetSelect.value = target.id;
        }
        if (target) {
          blocks = JSON.parse(JSON.stringify(target.blocks));
          allocProcesses = JSON.parse(JSON.stringify(target.processes));
          currentAllocStrategy = target.strategy;

          allocAlgoTabs.forEach(tab => {
            if (tab.dataset.strategy === currentAllocStrategy) tab.classList.add('active');
            else tab.classList.remove('active');
          });

          updateAllocInfoView();
          renderBlocksTable();
          renderAllocProcessTable();
          hideError();
          runAllocationSimulation();
          if (window.showToast) window.showToast(`Loaded allocation preset: ${target.name}`, 'info');
        }
      });
    }

    // Clear and Reset
    if (clearAllocBtn) {
      clearAllocBtn.addEventListener('click', () => {
        blocks = [];
        allocProcesses = [];
        renderBlocksTable();
        renderAllocProcessTable();
        clearAllocResults();
        showError('Memory blocks and process queue cleared. Add blocks and processes to allocate.');
        if (window.showToast) window.showToast('Cleared allocation tables', 'info');
      });
    }

    if (resetAllocBtn) {
      resetAllocBtn.addEventListener('click', () => {
        blocks = [
          { id: 'B1', size: 100 },
          { id: 'B2', size: 500 },
          { id: 'B3', size: 200 },
          { id: 'B4', size: 300 },
          { id: 'B5', size: 600 }
        ];
        allocProcesses = [
          { pid: 'P1', size: 212 },
          { pid: 'P2', size: 417 },
          { pid: 'P3', size: 112 },
          { pid: 'P4', size: 426 }
        ];
        renderBlocksTable();
        renderAllocProcessTable();
        hideError();
        runAllocationSimulation();
        if (window.showToast) window.showToast('Reset to default allocation benchmark', 'info');
      });
    }

    if (runAllocBtn) {
      runAllocBtn.addEventListener('click', runAllocationSimulation);
    }
  }

  function updateAllocInfoView() {
    const meta = allocMeta[currentAllocStrategy];
    if (meta && allocAlgoInfoContainer) {
      allocAlgoInfoContainer.innerHTML = `
        <div style="border-left: 3px solid var(--accent-emerald); padding-left: 1rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
            <h4 style="color:#fff; font-size:1.05rem; font-weight:700;">${meta.title}</h4>
            <span class="badge badge-emerald">${meta.type}</span>
            <span class="badge badge-amber">${meta.complexity}</span>
          </div>
          <p style="color:var(--text-secondary); font-size:0.86rem; line-height:1.5;">${meta.summary}</p>
        </div>
      `;
    }
  }

  function renderBlocksTable() {
    if (!allocBlocksTableBody) return;
    allocBlocksTableBody.innerHTML = '';

    if (blocks.length === 0) {
      allocBlocksTableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1rem;">
            No memory blocks defined. Enter size and click "+ Add Block".
          </td>
        </tr>
      `;
      return;
    }

    blocks.forEach((b, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color: var(--accent-emerald); font-family: monospace;">${b.id}</strong></td>
        <td>${b.size} KB</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-icon-sm del-block-btn" data-idx="${idx}" title="Delete Block" style="color:#ef4444;">&#10005;</button>
        </td>
      `;
      allocBlocksTableBody.appendChild(tr);
    });

    allocBlocksTableBody.querySelectorAll('.del-block-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        blocks.splice(idx, 1);
        renderBlocksTable();
        runAllocationSimulation();
      });
    });
  }

  function renderAllocProcessTable() {
    if (!allocProcessTableBody) return;
    allocProcessTableBody.innerHTML = '';

    if (allocProcesses.length === 0) {
      allocProcessTableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1rem;">
            No processes in request queue. Enter PID/size and click "+ Add Process".
          </td>
        </tr>
      `;
      return;
    }

    allocProcesses.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const color = getProcessColor(p.pid);
      tr.innerHTML = `
        <td>
          <span class="pid-badge" style="border-left: 3px solid ${color.border};">
            ${p.pid}
          </span>
        </td>
        <td>${p.size} KB</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-icon-sm del-alloc-proc-btn" data-idx="${idx}" title="Delete Process" style="color:#ef4444;">&#10005;</button>
        </td>
      `;
      allocProcessTableBody.appendChild(tr);
    });

    allocProcessTableBody.querySelectorAll('.del-alloc-proc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        allocProcesses.splice(idx, 1);
        renderAllocProcessTable();
        runAllocationSimulation();
      });
    });
  }

  async function runAllocationSimulation() {
    if (blocks.length === 0 || allocProcesses.length === 0) {
      clearAllocResults();
      return;
    }

    hideError();

    const payload = {
      strategy: currentAllocStrategy,
      blocks,
      processes: allocProcesses
    };

    try {
      if (runAllocBtn) runAllocBtn.classList.add('loading');

      const res = await fetch('/api/memory-management/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Memory allocation failed.');
      }

      lastAllocResult = data;
      renderAllocationResults(data);
    } catch (err) {
      console.error('[Allocation Error]:', err);
      showError(err.message || 'An error occurred during memory allocation.');
    } finally {
      if (runAllocBtn) runAllocBtn.classList.remove('loading');
    }
  }

  function renderAllocationResults(data) {
    const { blocks: resultBlocks, processResults, metrics } = data;

    // 1. Render Metrics KPIs
    if (metricTotalMemory) metricTotalMemory.textContent = `${metrics.totalMemory} KB`;
    if (metricAllocatedMemory) metricAllocatedMemory.textContent = `${metrics.totalAllocated} KB (${metrics.memoryUtilization}%)`;
    if (metricFreeMemory) metricFreeMemory.textContent = `${metrics.totalFree} KB`;
    if (metricInternalFrag) metricInternalFrag.textContent = `${metrics.totalInternalFrag} KB`;
    if (metricExternalFrag) metricExternalFrag.textContent = `${metrics.externalFragmentation} KB`;
    if (metricAllocRate) metricAllocRate.textContent = `${metrics.allocationRate}%`;

    // 2. Render Interactive Memory Map
    renderMemoryMap(resultBlocks, metrics.totalMemory);

    // 3. Render Detailed Results Table
    renderAllocResultsTable(processResults, resultBlocks);
  }

  function renderMemoryMap(blocksData, totalMemory) {
    if (!memoryMapTrack) return;
    memoryMapTrack.innerHTML = '';

    if (!blocksData || blocksData.length === 0 || totalMemory <= 0) {
      memoryMapTrack.innerHTML = '<div style="color:var(--text-muted); padding:2rem; margin:auto;">No memory map generated.</div>';
      return;
    }

    blocksData.forEach(block => {
      const cell = document.createElement('div');
      cell.className = 'memory-block-cell';
      const widthPct = (block.size / totalMemory) * 100;
      cell.style.flex = `${block.size} 0 0`;
      cell.style.minWidth = '110px';

      const header = document.createElement('div');
      header.className = 'memory-block-header';
      header.innerHTML = `
        <span>${block.id} [${block.baseAddress}K]</span>
        <span>${block.size} KB</span>
      `;
      cell.appendChild(header);

      const body = document.createElement('div');
      body.className = 'memory-block-body';

      if (block.isAllocated) {
        // Allocated portion
        const allocPortion = document.createElement('div');
        allocPortion.className = 'portion-allocated';
        const color = getProcessColor(block.allocatedTo);
        allocPortion.style.background = color.bg;
        allocPortion.style.borderRight = '1px solid rgba(255,255,255,0.2)';
        allocPortion.style.flex = `${block.processSize} 0 0`;
        allocPortion.innerHTML = `
          <span>${block.allocatedTo}</span>
          <span style="font-size:0.68rem; font-weight:400; opacity:0.9;">${block.processSize} KB</span>
        `;
        body.appendChild(allocPortion);

        // Internal Fragmentation hole if any
        if (block.internalFrag > 0) {
          const fragPortion = document.createElement('div');
          fragPortion.className = 'portion-internal-frag';
          fragPortion.style.flex = `${block.internalFrag} 0 0`;
          fragPortion.title = `Internal Fragmentation: ${block.internalFrag} KB unused in ${block.id}`;
          fragPortion.innerHTML = `
            <span>Frag: ${block.internalFrag}K</span>
          `;
          body.appendChild(fragPortion);
        }
      } else {
        // Free Hole
        const freePortion = document.createElement('div');
        freePortion.className = 'portion-free-hole';
        freePortion.innerHTML = `
          <span>FREE HOLE</span>
          <span style="font-size:0.68rem; opacity:0.8;">${block.size} KB</span>
        `;
        body.appendChild(freePortion);
      }

      cell.appendChild(body);
      memoryMapTrack.appendChild(cell);
    });
  }

  function renderAllocResultsTable(processResults, blocksData) {
    if (!allocResultsTableBody) return;
    allocResultsTableBody.innerHTML = '';

    processResults.forEach(p => {
      const tr = document.createElement('tr');
      const color = getProcessColor(p.pid);

      if (p.allocated) {
        tr.innerHTML = `
          <td>
            <span class="pid-badge" style="border-left: 3px solid ${color.border};">
              ${p.pid}
            </span>
          </td>
          <td>${p.size} KB</td>
          <td><span class="badge badge-emerald">&#10004; Allocated to ${p.blockId}</span></td>
          <td>${p.baseAddress} KB</td>
          <td><span style="color: var(--accent-amber); font-weight: 600;">${p.internalFrag} KB</span></td>
        `;
      } else {
        tr.innerHTML = `
          <td>
            <span class="pid-badge" style="border-left: 3px solid ${color.border};">
              ${p.pid}
            </span>
          </td>
          <td>${p.size} KB</td>
          <td><span class="badge badge-red" style="background: rgba(239,68,68,0.2); color:#fca5a5; border:1px solid rgba(239,68,68,0.4);">&#10005; Allocation Failed</span></td>
          <td style="color:var(--text-muted);">&mdash;</td>
          <td style="color:var(--text-muted);">&mdash;</td>
        `;
      }

      allocResultsTableBody.appendChild(tr);
    });
  }

  function clearAllocResults() {
    if (memoryMapTrack) memoryMapTrack.innerHTML = '<div style="color:var(--text-muted); padding:2rem; margin:auto;">No memory map generated.</div>';
    if (allocResultsTableBody) allocResultsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No allocation data available.</td></tr>';
    if (metricTotalMemory) metricTotalMemory.textContent = '-- KB';
    if (metricAllocatedMemory) metricAllocatedMemory.textContent = '-- KB';
    if (metricFreeMemory) metricFreeMemory.textContent = '-- KB';
    if (metricInternalFrag) metricInternalFrag.textContent = '-- KB';
    if (metricExternalFrag) metricExternalFrag.textContent = '-- KB';
    if (metricAllocRate) metricAllocRate.textContent = '--%';
  }

  // ==========================================
  // 2. PAGE REPLACEMENT LOGIC
  // ==========================================
  function setupPageControls() {
    // Algorithm tabs
    pageAlgoTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        pageAlgoTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentPageAlgorithm = tab.dataset.algo;
        updatePageInfoView();
        hideError();
        runPageReplacementSimulation();
      });
    });

    if (inputFramesCount) {
      inputFramesCount.addEventListener('change', () => {
        const val = Number(inputFramesCount.value);
        if (Number.isFinite(val) && val >= 1 && Number.isInteger(val)) {
          framesCount = val;
          hideError();
          runPageReplacementSimulation();
        } else {
          showError('Number of frames must be an integer >= 1.');
        }
      });
    }

    if (pagePresetSelect) {
      pagePresetSelect.addEventListener('change', (e) => {
        const id = e.target.value;
        if (!id) return;
        const found = pagePresets.find(p => p.id === id);
        if (found) {
          referencePages = [...found.referenceString];
          framesCount = found.framesCount;
          currentPageAlgorithm = found.algorithm;

          if (inputRefString) inputRefString.value = referencePages.join(', ');
          if (inputFramesCount) inputFramesCount.value = framesCount;

          pageAlgoTabs.forEach(tab => {
            if (tab.dataset.algo === currentPageAlgorithm) tab.classList.add('active');
            else tab.classList.remove('active');
          });

          updatePageInfoView();
          hideError();
          runPageReplacementSimulation();
          if (window.showToast) window.showToast(`Loaded page preset: ${found.name}`, 'info');
        }
      });
    }

    if (loadPageSampleBtn) {
      loadPageSampleBtn.addEventListener('click', () => {
        let target = null;
        if (pagePresetSelect && pagePresetSelect.value) {
          target = pagePresets.find(p => p.id === pagePresetSelect.value);
        }
        if (!target && pagePresets.length > 0) {
          target = pagePresets[0];
          if (pagePresetSelect) pagePresetSelect.value = target.id;
        }
        if (target) {
          referencePages = [...target.referenceString];
          framesCount = target.framesCount;
          currentPageAlgorithm = target.algorithm;

          if (inputRefString) inputRefString.value = referencePages.join(', ');
          if (inputFramesCount) inputFramesCount.value = framesCount;

          pageAlgoTabs.forEach(tab => {
            if (tab.dataset.algo === currentPageAlgorithm) tab.classList.add('active');
            else tab.classList.remove('active');
          });

          updatePageInfoView();
          hideError();
          runPageReplacementSimulation();
          if (window.showToast) window.showToast(`Loaded page preset: ${target.name}`, 'info');
        }
      });
    }

    if (runPageSimBtn) {
      runPageSimBtn.addEventListener('click', () => {
        if (inputRefString) {
          const raw = inputRefString.value.trim();
          if (!raw) {
            showError('Please enter a page reference sequence (e.g. 7, 0, 1, 2).');
            inputRefString.focus();
            return;
          }
          const parsed = raw.split(/[\s,]+/).map(s => Number(s.trim())).filter(n => Number.isFinite(n));
          if (parsed.length === 0) {
            showError('Page reference sequence must contain valid integer page numbers.');
            inputRefString.focus();
            return;
          }
          referencePages = parsed;
        }
        runPageReplacementSimulation();
      });
    }

    if (clearPageBtn) {
      clearPageBtn.addEventListener('click', () => {
        referencePages = [];
        if (inputRefString) inputRefString.value = '';
        clearPageResults();
        showError('Page reference string cleared. Enter page numbers to simulate.');
        if (window.showToast) window.showToast('Cleared page reference string', 'info');
      });
    }

    if (resetPageBtn) {
      resetPageBtn.addEventListener('click', () => {
        referencePages = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
        framesCount = 3;
        if (inputRefString) inputRefString.value = referencePages.join(', ');
        if (inputFramesCount) inputFramesCount.value = framesCount;
        hideError();
        runPageReplacementSimulation();
        if (window.showToast) window.showToast('Reset to Silberschatz reference benchmark', 'info');
      });
    }

    // Playback Controls
    setupPlaybackControls();
  }

  function updatePageInfoView() {
    const meta = pageMeta[currentPageAlgorithm];
    if (meta && pageAlgoInfoContainer) {
      pageAlgoInfoContainer.innerHTML = `
        <div style="border-left: 3px solid var(--accent-cyan); padding-left: 1rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
            <h4 style="color:#fff; font-size:1.05rem; font-weight:700;">${meta.title}</h4>
            <span class="badge badge-cyan">${meta.type}</span>
            <span class="badge badge-amber">${meta.complexity}</span>
          </div>
          <p style="color:var(--text-secondary); font-size:0.86rem; line-height:1.5;">${meta.summary}</p>
        </div>
      `;
    }
  }

  async function runPageReplacementSimulation() {
    if (referencePages.length === 0) {
      clearPageResults();
      return;
    }

    hideError();
    stopPlayback();

    const payload = {
      algorithm: currentPageAlgorithm,
      referenceString: referencePages,
      framesCount
    };

    try {
      if (runPageSimBtn) runPageSimBtn.classList.add('loading');

      const res = await fetch('/api/memory-management/page-replacement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Page replacement simulation failed.');
      }

      lastPageResult = data;
      renderPageResults(data);
    } catch (err) {
      console.error('[Page Replacement Error]:', err);
      showError(err.message || 'An error occurred during page replacement.');
    } finally {
      if (runPageSimBtn) runPageSimBtn.classList.remove('loading');
    }
  }

  function renderPageResults(data) {
    const { steps, metrics, framesCount: fCount } = data;

    // 1. KPIs
    if (metricTotalRefs) metricTotalRefs.textContent = metrics.totalReferences;
    if (metricPageFaults) metricPageFaults.textContent = `${metrics.pageFaults}`;
    if (metricPageHits) metricPageHits.textContent = `${metrics.pageHits}`;
    if (metricFaultRate) metricFaultRate.textContent = `${metrics.faultRate}%`;
    if (metricHitRate) metricHitRate.textContent = `${metrics.hitRate}%`;

    // 2. Render Matrix Table
    renderPageMatrixTable(steps, fCount);

    // 3. Reset playback step to final completed step
    currentPlaybackStep = steps.length - 1;
    updatePlaybackDisplay();
  }

  function renderPageMatrixTable(steps, fCount) {
    if (!pageMatrixContainer) return;
    pageMatrixContainer.innerHTML = '';

    if (!steps || steps.length === 0) {
      pageMatrixContainer.innerHTML = '<div style="color:var(--text-muted); padding:2rem; text-align:center;">No page reference steps available.</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'page-matrix-table';

    // 1. Step row
    const stepRow = document.createElement('tr');
    stepRow.innerHTML = '<th class="row-header">Step</th>';
    steps.forEach(s => {
      const th = document.createElement('th');
      th.className = 'step-col-header';
      th.dataset.step = s.step - 1;
      th.style.fontSize = '0.72rem';
      th.style.color = 'var(--text-muted)';
      th.textContent = s.step;
      stepRow.appendChild(th);
    });
    table.appendChild(stepRow);

    // 2. Referenced Page row
    const refRow = document.createElement('tr');
    refRow.innerHTML = '<th class="row-header">Page Ref</th>';
    steps.forEach(s => {
      const td = document.createElement('td');
      td.className = 'page-ref-cell step-cell';
      td.dataset.step = s.step - 1;
      td.textContent = s.page;
      refRow.appendChild(td);
    });
    table.appendChild(refRow);

    // 3. Frame slots rows (F0, F1, F2 ...)
    for (let f = 0; f < fCount; f++) {
      const frameRow = document.createElement('tr');
      frameRow.innerHTML = `<th class="row-header">Frame ${f + 1}</th>`;

      steps.forEach(s => {
        const td = document.createElement('td');
        td.className = 'page-frame-cell step-cell';
        td.dataset.step = s.step - 1;

        const val = s.frames[f];
        if (val !== null && val !== undefined) {
          td.textContent = val;
          if (s.frameIndex === f && s.status === 'FAULT') {
            td.classList.add('cell-updated');
          }
        } else {
          td.textContent = '—';
          td.classList.add('cell-empty');
        }

        frameRow.appendChild(td);
      });

      table.appendChild(frameRow);
    }

    // 4. Status row (Hit vs Fault)
    const statusRow = document.createElement('tr');
    statusRow.innerHTML = '<th class="row-header">Result</th>';
    steps.forEach(s => {
      const td = document.createElement('td');
      td.className = `page-status-cell step-cell ${s.status === 'HIT' ? 'status-hit' : 'status-fault'}`;
      td.dataset.step = s.step - 1;
      td.textContent = s.status;
      statusRow.appendChild(td);
    });
    table.appendChild(statusRow);

    // 5. Evicted page row
    const evictRow = document.createElement('tr');
    evictRow.innerHTML = '<th class="row-header">Evicted</th>';
    steps.forEach(s => {
      const td = document.createElement('td');
      td.className = 'step-cell';
      td.dataset.step = s.step - 1;
      td.style.fontSize = '0.74rem';
      td.style.color = 'var(--text-muted)';
      td.textContent = s.replacedPage !== null ? s.replacedPage : '—';
      evictRow.appendChild(td);
    });
    table.appendChild(evictRow);

    pageMatrixContainer.appendChild(table);
  }

  // --- Step-by-Step Playback Controller ---
  function setupPlaybackControls() {
    if (pagePlayBtn) {
      pagePlayBtn.addEventListener('click', togglePlayback);
    }
    if (pagePrevBtn) {
      pagePrevBtn.addEventListener('click', () => {
        stopPlayback();
        if (currentPlaybackStep > 0) {
          currentPlaybackStep--;
          updatePlaybackDisplay();
        }
      });
    }
    if (pageNextBtn) {
      pageNextBtn.addEventListener('click', () => {
        stopPlayback();
        if (lastPageResult && currentPlaybackStep < lastPageResult.steps.length - 1) {
          currentPlaybackStep++;
          updatePlaybackDisplay();
        }
      });
    }
    if (pageResetStepBtn) {
      pageResetStepBtn.addEventListener('click', () => {
        stopPlayback();
        currentPlaybackStep = 0;
        updatePlaybackDisplay();
      });
    }
    if (pageSpeedSelect) {
      pageSpeedSelect.addEventListener('change', () => {
        playbackSpeed = Number(pageSpeedSelect.value) || 800;
        if (playbackTimer) {
          stopPlayback();
          startPlayback();
        }
      });
    }
  }

  function togglePlayback() {
    if (playbackTimer) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    if (!lastPageResult || !lastPageResult.steps || lastPageResult.steps.length === 0) return;
    if (currentPlaybackStep >= lastPageResult.steps.length - 1) {
      currentPlaybackStep = -1;
    }

    if (pagePlayBtn) {
      pagePlayBtn.innerHTML = '&#10074;&#10074; Pause';
      pagePlayBtn.classList.add('btn-primary');
      pagePlayBtn.classList.remove('btn-secondary');
    }

    playbackTimer = setInterval(() => {
      if (currentPlaybackStep < lastPageResult.steps.length - 1) {
        currentPlaybackStep++;
        updatePlaybackDisplay();
      } else {
        stopPlayback();
      }
    }, playbackSpeed);
  }

  function stopPlayback() {
    if (playbackTimer) {
      clearInterval(playbackTimer);
      playbackTimer = null;
    }
    if (pagePlayBtn) {
      pagePlayBtn.innerHTML = '&#9654; Play';
      pagePlayBtn.classList.remove('btn-primary');
      pagePlayBtn.classList.add('btn-secondary');
    }
  }

  function updatePlaybackDisplay() {
    if (!lastPageResult || !lastPageResult.steps) return;
    const total = lastPageResult.steps.length;

    if (pageStepCounter) {
      pageStepCounter.innerHTML = `Step <strong>${currentPlaybackStep + 1}</strong> of <strong>${total}</strong>`;
    }

    // Highlight current column in table
    const allStepCells = document.querySelectorAll('.step-cell, .step-col-header');
    allStepCells.forEach(cell => {
      const stepIdx = Number(cell.dataset.step);
      if (stepIdx === currentPlaybackStep) {
        cell.style.outline = '2px solid var(--accent-cyan)';
        cell.style.outlineOffset = '-1px';
      } else {
        cell.style.outline = 'none';
      }
    });

    // Update Live Display of frames at this step
    if (currentFramesLiveDisplay && currentPlaybackStep >= 0 && currentPlaybackStep < total) {
      const stepData = lastPageResult.steps[currentPlaybackStep];
      currentFramesLiveDisplay.innerHTML = '';

      const headerDiv = document.createElement('div');
      headerDiv.style.marginBottom = '0.65rem';
      headerDiv.style.fontSize = '0.85rem';
      headerDiv.style.color = '#fff';
      headerDiv.innerHTML = `
        Current Reference: <strong style="color:var(--accent-cyan); font-size:1.1rem;">Page ${stepData.page}</strong> &bull; 
        Result: <span class="badge ${stepData.status === 'HIT' ? 'badge-emerald' : 'badge-amber'}">${stepData.status}</span>
        ${stepData.replacedPage !== null ? `(Evicted Page ${stepData.replacedPage})` : ''}
      `;
      currentFramesLiveDisplay.appendChild(headerDiv);

      const slotsGrid = document.createElement('div');
      slotsGrid.style.display = 'grid';
      slotsGrid.style.gridTemplateColumns = `repeat(${stepData.frames.length}, 1fr)`;
      slotsGrid.style.gap = '0.6rem';

      stepData.frames.forEach((val, fIdx) => {
        const slot = document.createElement('div');
        slot.style.background = 'var(--bg-darkest)';
        slot.style.border = '1px solid var(--border-subtle)';
        slot.style.borderRadius = 'var(--radius-sm)';
        slot.style.padding = '0.85rem';
        slot.style.textAlign = 'center';

        if (stepData.frameIndex === fIdx) {
          slot.style.borderColor = stepData.status === 'HIT' ? 'var(--accent-emerald)' : 'var(--accent-cyan)';
          slot.style.boxShadow = `0 0 10px ${stepData.status === 'HIT' ? 'rgba(16,185,129,0.25)' : 'rgba(6,182,212,0.25)'}`;
        }

        slot.innerHTML = `
          <div style="font-size:0.68rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Frame ${fIdx + 1}</div>
          <div style="font-size:1.4rem; font-weight:800; color:${val !== null ? '#fff' : '#475569'}; margin-top:0.25rem;">
            ${val !== null ? val : '—'}
          </div>
        `;
        slotsGrid.appendChild(slot);
      });

      currentFramesLiveDisplay.appendChild(slotsGrid);
    }
  }

  function clearPageResults() {
    stopPlayback();
    if (pageMatrixContainer) pageMatrixContainer.innerHTML = '<div style="color:var(--text-muted); padding:2rem; text-align:center;">No page reference steps available.</div>';
    if (currentFramesLiveDisplay) currentFramesLiveDisplay.innerHTML = '';
    if (metricTotalRefs) metricTotalRefs.textContent = '0';
    if (metricPageFaults) metricPageFaults.textContent = '--';
    if (metricPageHits) metricPageHits.textContent = '--';
    if (metricFaultRate) metricFaultRate.textContent = '--%';
    if (metricHitRate) metricHitRate.textContent = '--%';
    if (pageStepCounter) pageStepCounter.textContent = 'Step 0 of 0';
  }

  // ==========================================
  // ERROR BANNER HELPERS
  // ==========================================
  function showError(msg) {
    if (memoryErrorAlert && memoryErrorAlertText) {
      memoryErrorAlertText.textContent = msg;
      memoryErrorAlert.style.display = 'flex';
    }
    if (window.showToast) {
      window.showToast(msg, 'error');
    }
  }

  function hideError() {
    if (memoryErrorAlert) {
      memoryErrorAlert.style.display = 'none';
    }
  }

  // Self-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
