/**
 * OS-Vision: Module 2 - Scheduling Algorithm Comparison Script
 * Benchmarks FCFS, SJF, SRTF, Priority, and Round Robin on identical workloads.
 */

(function () {
  'use strict';

  // --- Initial State ---
  let timeQuantum = 2;
  let processes = [
    { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
    { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
    { pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
    { pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 }
  ];

  let sampleScenarios = [];
  let comparisonResults = null;

  // Color mapping palette for process Gantt visualization (Consistent with Module 1)
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
    if (pid === 'IDLE') {
      return {
        bg: 'repeating-linear-gradient(45deg, #1e293b, #1e293b 10px, #0f172a 10px, #0f172a 20px)',
        border: '#475569',
        text: '#94a3b8'
      };
    }
    if (!processColorMap.has(pid)) {
      const idx = processColorMap.size % colorPalette.length;
      processColorMap.set(pid, colorPalette[idx]);
    }
    return processColorMap.get(pid);
  }

  // --- DOM Elements ---
  const presetSelect = document.getElementById('presetSelect');
  const loadPresetBtn = document.getElementById('loadPresetBtn');
  const timeQuantumInput = document.getElementById('timeQuantumInput');
  const runCompareBtn = document.getElementById('runCompareBtn');
  const addProcessBtn = document.getElementById('addProcessBtn');
  const resetProcessesBtn = document.getElementById('resetProcessesBtn');
  const clearProcessesBtn = document.getElementById('clearProcessesBtn');
  const errorAlert = document.getElementById('errorAlert');
  const errorAlertText = document.getElementById('errorAlertText');
  const processCountBadge = document.getElementById('processCountBadge');

  const inputPid = document.getElementById('inputPid');
  const inputArrival = document.getElementById('inputArrival');
  const inputBurst = document.getElementById('inputBurst');
  const inputPriority = document.getElementById('inputPriority');

  const comparisonProcessTableBody = document.getElementById('comparisonProcessTableBody');
  const comparisonTableBody = document.getElementById('comparisonTableBody');
  const multiGanttTracks = document.getElementById('multiGanttTracks');
  const multiGanttLegend = document.getElementById('multiGanttLegend');

  // Highlight Elements
  const highlightBestWt = document.getElementById('highlightBestWt');
  const highlightBestWtAlgo = document.getElementById('highlightBestWtAlgo');
  const highlightBestTat = document.getElementById('highlightBestTat');
  const highlightBestTatAlgo = document.getElementById('highlightBestTatAlgo');
  const highlightBestRt = document.getElementById('highlightBestRt');
  const highlightBestRtAlgo = document.getElementById('highlightBestRtAlgo');
  const highlightBestUtil = document.getElementById('highlightBestUtil');
  const highlightBestUtilAlgo = document.getElementById('highlightBestUtilAlgo');
  const highlightBestThroughput = document.getElementById('highlightBestThroughput');
  const highlightBestThroughputAlgo = document.getElementById('highlightBestThroughputAlgo');

  // Modal Elements
  const detailModal = document.getElementById('detailModal');
  const modalAlgoTitle = document.getElementById('modalAlgoTitle');
  const modalAlgoDesc = document.getElementById('modalAlgoDesc');
  const modalProcessTableBody = document.getElementById('modalProcessTableBody');
  const modalCloseBtn2 = document.getElementById('modalCloseBtn2');
  const modalDismissBtn = document.getElementById('modalDismissBtn');

  // --- Alert Helpers ---
  function showError(msg) {
    if (errorAlert && errorAlertText) {
      errorAlertText.textContent = msg;
      errorAlert.style.display = 'flex';
    }
  }

  function hideError() {
    if (errorAlert) {
      errorAlert.style.display = 'none';
    }
  }

  // --- Workload Table Rendering ---
  function renderProcessTable() {
    if (!comparisonProcessTableBody) return;
    comparisonProcessTableBody.innerHTML = '';

    if (processCountBadge) {
      processCountBadge.textContent = `${processes.length} Process${processes.length === 1 ? '' : 'es'}`;
    }

    if (processes.length === 0) {
      comparisonProcessTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            No processes in workload queue. Add a process or load a preset above to begin.
          </td>
        </tr>
      `;
      return;
    }

    processes.forEach((p, idx) => {
      const color = getProcessColor(p.pid);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="pid-badge" style="background: ${color.bg}; border: 1px solid ${color.border}; color: ${color.text};">
            ${escapeHtml(p.pid)}
          </span>
        </td>
        <td>${p.arrivalTime} ms</td>
        <td>${p.burstTime} ms</td>
        <td><span class="badge badge-blue">Rank ${p.priority}</span></td>
        <td style="text-align: right;">
          <button type="button" class="btn-icon-sm btn-delete-proc" data-index="${idx}" title="Delete process" style="color: #f87171;">
            &times;
          </button>
        </td>
      `;
      comparisonProcessTableBody.appendChild(tr);
    });

    // Attach delete listeners
    document.querySelectorAll('.btn-delete-proc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx) && idx >= 0 && idx < processes.length) {
          processes.splice(idx, 1);
          renderProcessTable();
          if (processes.length > 0) {
            runComparison();
          } else {
            clearComparisonViews();
          }
        }
      });
    });
  }

  function clearComparisonViews() {
    if (comparisonTableBody) {
      comparisonTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            Queue is empty. Add processes to execute algorithm comparison.
          </td>
        </tr>
      `;
    }
    if (multiGanttTracks) multiGanttTracks.innerHTML = '';
    if (multiGanttLegend) multiGanttLegend.innerHTML = '';
    resetHighlightBoxes();
  }

  function resetHighlightBoxes() {
    if (highlightBestWt) highlightBestWt.textContent = '--';
    if (highlightBestWtAlgo) highlightBestWtAlgo.textContent = 'Awaiting workload';
    if (highlightBestTat) highlightBestTat.textContent = '--';
    if (highlightBestTatAlgo) highlightBestTatAlgo.textContent = 'Awaiting workload';
    if (highlightBestRt) highlightBestRt.textContent = '--';
    if (highlightBestRtAlgo) highlightBestRtAlgo.textContent = 'Awaiting workload';
    if (highlightBestUtil) highlightBestUtil.textContent = '--';
    if (highlightBestUtilAlgo) highlightBestUtilAlgo.textContent = 'Awaiting workload';
    if (highlightBestThroughput) highlightBestThroughput.textContent = '--';
    if (highlightBestThroughputAlgo) highlightBestThroughputAlgo.textContent = 'Awaiting workload';
  }

  // --- Add Process ---
  function addProcessFromForm() {
    hideError();
    const pidVal = (inputPid ? inputPid.value : '').trim().toUpperCase();
    const arrivalVal = Number(inputArrival ? inputArrival.value : 0);
    const burstVal = Number(inputBurst ? inputBurst.value : 1);
    const priorityVal = Number(inputPriority ? inputPriority.value : 1);

    if (!pidVal) {
      showError('Please enter a valid Process ID (e.g. P5).');
      return;
    }

    if (processes.some(p => p.pid.toUpperCase() === pidVal)) {
      showError(`Process ID '${pidVal}' already exists in workload queue.`);
      return;
    }

    if (!Number.isFinite(arrivalVal) || arrivalVal < 0) {
      showError('Arrival time must be a non-negative number (>= 0).');
      return;
    }

    if (!Number.isFinite(burstVal) || burstVal <= 0) {
      showError('Burst time must be greater than zero (> 0).');
      return;
    }

    if (!Number.isFinite(priorityVal)) {
      showError('Priority must be a valid number.');
      return;
    }

    processes.push({
      pid: pidVal,
      arrivalTime: arrivalVal,
      burstTime: burstVal,
      priority: priorityVal
    });

    // Reset PID input for next entry
    if (inputPid) {
      const nextNum = processes.length + 1;
      inputPid.value = `P${nextNum}`;
    }

    renderProcessTable();
    runComparison();
  }

  // --- Run Comparison Simulation API ---
  async function runComparison() {
    if (processes.length === 0) {
      showError('Cannot compare algorithms with an empty process workload.');
      return;
    }

    hideError();
    if (runCompareBtn) {
      runCompareBtn.classList.add('loading');
      runCompareBtn.disabled = true;
    }

    const tq = Number(timeQuantumInput ? timeQuantumInput.value : 2) || 2;
    timeQuantum = tq;

    try {
      const response = await fetch('/api/cpu-scheduling/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processes,
          timeQuantum: tq
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to simulate comparison algorithms.');
      }

      comparisonResults = data;
      renderComparisonTable(data.comparison);
      renderHighlights(data.comparison);
      renderMultiGantt(data.results);
    } catch (err) {
      console.error('[Scheduling Comparison Error]:', err);
      showError(err.message || 'Error executing comparison simulation.');
    } finally {
      if (runCompareBtn) {
        runCompareBtn.classList.remove('loading');
        runCompareBtn.disabled = false;
      }
    }
  }

  // --- Render Comparison Table with Measured Best Highlights ---
  function renderComparisonTable(comparisonList) {
    if (!comparisonTableBody || !comparisonList || comparisonList.length === 0) return;
    comparisonTableBody.innerHTML = '';

    // Calculate empirical best values
    const minWt = Math.min(...comparisonList.map(c => c.avgWaitingTime));
    const minTat = Math.min(...comparisonList.map(c => c.avgTurnaroundTime));
    const minRt = Math.min(...comparisonList.map(c => c.avgResponseTime));
    const maxUtil = Math.max(...comparisonList.map(c => c.cpuUtilization));
    const maxThroughput = Math.max(...comparisonList.map(c => c.throughput));

    // Count occurrences for tie detection
    const wtTies = comparisonList.filter(c => c.avgWaitingTime === minWt).length > 1;
    const tatTies = comparisonList.filter(c => c.avgTurnaroundTime === minTat).length > 1;
    const rtTies = comparisonList.filter(c => c.avgResponseTime === minRt).length > 1;
    const utilTies = comparisonList.filter(c => c.cpuUtilization === maxUtil).length > 1;
    const tpTies = comparisonList.filter(c => c.throughput === maxThroughput).length > 1;

    comparisonList.forEach(item => {
      const tr = document.createElement('tr');

      const isBestWt = item.avgWaitingTime === minWt;
      const isBestTat = item.avgTurnaroundTime === minTat;
      const isBestRt = item.avgResponseTime === minRt;
      const isBestUtil = item.cpuUtilization === maxUtil;
      const isBestTp = item.throughput === maxThroughput;

      // Algorithm badge styling
      let badgeClass = 'badge-blue';
      if (item.algorithmKey === 'fcfs') badgeClass = 'badge-cyan';
      else if (item.algorithmKey === 'sjf') badgeClass = 'badge-emerald';
      else if (item.algorithmKey === 'srtf') badgeClass = 'badge-purple';
      else if (item.algorithmKey === 'rr') badgeClass = 'badge-amber';

      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge ${badgeClass}" style="font-weight: 700;">${escapeHtml(item.algorithmKey.toUpperCase())}</span>
            <span style="font-weight: 600; color: #fff;">${escapeHtml(item.algorithmName)}</span>
          </div>
        </td>
        <td>
          <span style="font-size: 0.76rem; color: var(--text-muted);">${escapeHtml(item.type)}</span>
        </td>
        <td class="${isBestWt ? 'best-metric-cell' : ''}">
          ${item.avgWaitingTime.toFixed(2)} ms
          ${isBestWt ? (wtTies ? '<span class="badge-tie">★ Tie</span>' : '<span class="badge-best">★ Best</span>') : ''}
        </td>
        <td class="${isBestTat ? 'best-metric-cell' : ''}">
          ${item.avgTurnaroundTime.toFixed(2)} ms
          ${isBestTat ? (tatTies ? '<span class="badge-tie">★ Tie</span>' : '<span class="badge-best">★ Best</span>') : ''}
        </td>
        <td class="${isBestRt ? 'best-metric-cell' : ''}">
          ${item.avgResponseTime.toFixed(2)} ms
          ${isBestRt ? (rtTies ? '<span class="badge-tie">★ Tie</span>' : '<span class="badge-best">★ Best</span>') : ''}
        </td>
        <td class="${isBestUtil ? 'best-metric-cell' : ''}">
          ${item.cpuUtilization.toFixed(1)}%
          ${isBestUtil ? (utilTies ? '<span class="badge-tie">★ Max</span>' : '<span class="badge-best">★ Max</span>') : ''}
        </td>
        <td class="${isBestTp ? 'best-metric-cell' : ''}">
          ${item.throughput.toFixed(4)}
          ${isBestTp ? (tpTies ? '<span class="badge-tie">★ Max</span>' : '<span class="badge-best">★ Max</span>') : ''}
        </td>
        <td style="font-family: monospace;">
          ${item.totalTime} ms
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-inspect-algo" data-algo="${item.algorithmKey}" style="padding: 0.25rem 0.6rem; font-size: 0.74rem;">
            Inspect
          </button>
        </td>
      `;

      comparisonTableBody.appendChild(tr);
    });

    // Attach inspect click handlers
    document.querySelectorAll('.btn-inspect-algo').forEach(btn => {
      btn.addEventListener('click', () => {
        const algoKey = btn.dataset.algo;
        if (comparisonResults && comparisonResults.results && comparisonResults.results[algoKey]) {
          showAlgorithmDetails(comparisonResults.results[algoKey]);
        }
      });
    });
  }

  // --- Render Highlight Cards ---
  function renderHighlights(comparisonList) {
    if (!comparisonList || comparisonList.length === 0) return;

    // Minimum Waiting Time
    const minWt = Math.min(...comparisonList.map(c => c.avgWaitingTime));
    const bestWtItems = comparisonList.filter(c => c.avgWaitingTime === minWt);
    if (highlightBestWt) highlightBestWt.textContent = `${minWt.toFixed(2)} ms`;
    if (highlightBestWtAlgo) {
      highlightBestWtAlgo.textContent = bestWtItems.map(b => b.algorithmKey.toUpperCase()).join(', ');
    }

    // Minimum Turnaround Time
    const minTat = Math.min(...comparisonList.map(c => c.avgTurnaroundTime));
    const bestTatItems = comparisonList.filter(c => c.avgTurnaroundTime === minTat);
    if (highlightBestTat) highlightBestTat.textContent = `${minTat.toFixed(2)} ms`;
    if (highlightBestTatAlgo) {
      highlightBestTatAlgo.textContent = bestTatItems.map(b => b.algorithmKey.toUpperCase()).join(', ');
    }

    // Minimum Response Time
    const minRt = Math.min(...comparisonList.map(c => c.avgResponseTime));
    const bestRtItems = comparisonList.filter(c => c.avgResponseTime === minRt);
    if (highlightBestRt) highlightBestRt.textContent = `${minRt.toFixed(2)} ms`;
    if (highlightBestRtAlgo) {
      highlightBestRtAlgo.textContent = bestRtItems.map(b => b.algorithmKey.toUpperCase()).join(', ');
    }

    // Max CPU Utilization
    const maxUtil = Math.max(...comparisonList.map(c => c.cpuUtilization));
    const bestUtilItems = comparisonList.filter(c => c.cpuUtilization === maxUtil);
    if (highlightBestUtil) highlightBestUtil.textContent = `${maxUtil.toFixed(1)}%`;
    if (highlightBestUtilAlgo) {
      highlightBestUtilAlgo.textContent = bestUtilItems.map(b => b.algorithmKey.toUpperCase()).join(', ');
    }

    // Max Throughput
    const maxTp = Math.max(...comparisonList.map(c => c.throughput));
    const bestTpItems = comparisonList.filter(c => c.throughput === maxTp);
    if (highlightBestThroughput) highlightBestThroughput.textContent = `${maxTp.toFixed(4)}`;
    if (highlightBestThroughputAlgo) {
      highlightBestThroughputAlgo.textContent = bestTpItems.map(b => b.algorithmKey.toUpperCase()).join(', ');
    }
  }

  // --- Render Synchronized Multi-Gantt Timeline ---
  function renderMultiGantt(results) {
    if (!multiGanttTracks || !results) return;
    multiGanttTracks.innerHTML = '';
    if (multiGanttLegend) multiGanttLegend.innerHTML = '';

    // Determine max makespan to normalize timeline widths
    let maxMakespan = 0;
    const algoOrder = ['fcfs', 'sjf', 'srtf', 'priority', 'rr'];
    algoOrder.forEach(key => {
      const sim = results[key];
      if (sim && sim.metrics && sim.metrics.totalTime > maxMakespan) {
        maxMakespan = sim.metrics.totalTime;
      }
    });

    if (maxMakespan <= 0) return;

    // Render unique process legend
    const uniquePids = new Set();
    processes.forEach(p => uniquePids.add(p.pid));
    uniquePids.forEach(pid => {
      const color = getProcessColor(pid);
      const legendItem = document.createElement('div');
      legendItem.className = 'gantt-legend-item';
      legendItem.innerHTML = `
        <span class="legend-swatch" style="background: ${color.bg}; border: 1px solid ${color.border};"></span>
        <span>${escapeHtml(pid)}</span>
      `;
      if (multiGanttLegend) multiGanttLegend.appendChild(legendItem);
    });

    // Render idle legend item
    const idleLegend = document.createElement('div');
    idleLegend.className = 'gantt-legend-item';
    idleLegend.innerHTML = `
      <span class="legend-swatch" style="background: repeating-linear-gradient(45deg, #1e293b, #1e293b 5px, #0f172a 5px, #0f172a 10px); border: 1px solid #475569;"></span>
      <span>CPU Idle</span>
    `;
    if (multiGanttLegend) multiGanttLegend.appendChild(idleLegend);

    // Render each algorithm's timeline bar
    algoOrder.forEach(algoKey => {
      const sim = results[algoKey];
      if (!sim) return;

      const row = document.createElement('div');
      row.className = 'multi-gantt-row';

      // Label
      const label = document.createElement('div');
      label.className = 'multi-gantt-label';
      label.innerHTML = `
        <span class="badge ${algoKey === 'fcfs' ? 'badge-cyan' : algoKey === 'sjf' ? 'badge-emerald' : algoKey === 'srtf' ? 'badge-purple' : algoKey === 'rr' ? 'badge-amber' : 'badge-blue'}" style="font-size: 0.7rem; font-weight: 700;">
          ${escapeHtml(algoKey.toUpperCase())}
        </span>
        <span style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(sim.algorithmName.split('(')[0].trim())}</span>
      `;
      row.appendChild(label);

      // Bar Track
      const track = document.createElement('div');
      track.className = 'multi-gantt-bar';

      sim.gantt.forEach(slice => {
        const sliceDuration = slice.duration || (slice.end - slice.start);
        const widthPercent = (sliceDuration / maxMakespan) * 100;
        const color = getProcessColor(slice.pid);

        const segment = document.createElement('div');
        segment.className = `gantt-segment ${slice.isIdle ? 'idle-segment' : ''}`;
        segment.style.width = `${widthPercent}%`;
        segment.style.background = color.bg;
        segment.style.color = color.text;

        segment.innerHTML = `
          <span>${escapeHtml(slice.pid)}</span>
          <div class="gantt-tooltip">
            <strong>${escapeHtml(slice.pid)}</strong> [${slice.start}ms &rarr; ${slice.end}ms]<br>
            Duration: ${sliceDuration}ms
          </div>
        `;

        track.appendChild(segment);
      });

      row.appendChild(track);
      multiGanttTracks.appendChild(row);
    });
  }

  // --- Show Algorithm Details Modal ---
  function showAlgorithmDetails(sim) {
    if (!detailModal || !sim) return;

    if (modalAlgoTitle) {
      modalAlgoTitle.textContent = `${sim.algorithmName} Detailed Execution`;
    }
    if (modalAlgoDesc) {
      modalAlgoDesc.textContent = `Detailed turnaround, waiting, and response timeline breakdown for ${sim.processResults.length} processes.`;
    }

    if (modalProcessTableBody) {
      modalProcessTableBody.innerHTML = '';
      sim.processResults.forEach(p => {
        const color = getProcessColor(p.pid);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <span class="pid-badge" style="background: ${color.bg}; border: 1px solid ${color.border}; color: ${color.text};">
              ${escapeHtml(p.pid)}
            </span>
          </td>
          <td>${p.arrivalTime} ms</td>
          <td>${p.burstTime} ms</td>
          <td>${p.priority}</td>
          <td>${p.startTime} ms</td>
          <td>${p.completionTime} ms</td>
          <td style="font-weight: 700; color: var(--accent-cyan);">${p.turnaroundTime} ms</td>
          <td style="font-weight: 700; color: var(--accent-emerald);">${p.waitingTime} ms</td>
          <td style="font-weight: 700; color: var(--accent-blue);">${p.responseTime} ms</td>
        `;
        modalProcessTableBody.appendChild(tr);
      });
    }

    detailModal.classList.add('active');
  }

  function hideModal() {
    if (detailModal) {
      detailModal.classList.remove('active');
    }
  }

  if (modalCloseBtn2) modalCloseBtn2.addEventListener('click', hideModal);
  if (modalDismissBtn) modalDismissBtn.addEventListener('click', hideModal);
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) hideModal();
    });
  }

  // --- Load Preset Workloads ---
  async function loadPreset() {
    const selectedId = presetSelect ? presetSelect.value : 'standard-mix';
    try {
      // Find from fetched sampleScenarios
      const found = sampleScenarios.find(s => s.id === selectedId);
      if (found) {
        processes = found.processes.map(p => ({ ...p }));
        if (timeQuantumInput && found.timeQuantum) {
          timeQuantumInput.value = found.timeQuantum;
        }
        renderProcessTable();
        runComparison();
        if (window.showToast) {
          window.showToast(`Loaded preset workload: ${found.name}`, 'info');
        }
      } else {
        // Fallback default
        resetDefaultWorkload();
      }
    } catch (err) {
      console.warn('Preset load failed:', err);
      resetDefaultWorkload();
    }
  }

  function resetDefaultWorkload() {
    processes = [
      { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
      { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
      { pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 }
    ];
    if (timeQuantumInput) timeQuantumInput.value = 2;
    renderProcessTable();
    runComparison();
  }

  // --- Fetch Samples from Server on Load ---
  async function fetchSamples() {
    try {
      const res = await fetch('/api/cpu-scheduling/samples');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.samples)) {
          sampleScenarios = data.samples;
        }
      }
    } catch (err) {
      console.warn('Could not fetch samples:', err);
    }
  }

  // Utility to escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Event Listeners Initialization ---
  function init() {
    if (addProcessBtn) {
      addProcessBtn.addEventListener('click', addProcessFromForm);
    }

    if (runCompareBtn) {
      runCompareBtn.addEventListener('click', runComparison);
    }

    if (resetProcessesBtn) {
      resetProcessesBtn.addEventListener('click', resetDefaultWorkload);
    }

    if (clearProcessesBtn) {
      clearProcessesBtn.addEventListener('click', () => {
        processes = [];
        renderProcessTable();
        clearComparisonViews();
      });
    }

    if (loadPresetBtn) {
      loadPresetBtn.addEventListener('click', loadPreset);
    }

    if (presetSelect) {
      presetSelect.addEventListener('change', loadPreset);
    }

    if (timeQuantumInput) {
      timeQuantumInput.addEventListener('change', () => {
        const val = Number(timeQuantumInput.value);
        if (val > 0) {
          timeQuantum = val;
          runComparison();
        }
      });
    }

    // Keydown in input fields to add on Enter
    [inputPid, inputArrival, inputBurst, inputPriority].forEach(input => {
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addProcessFromForm();
          }
        });
      }
    });

    // Initial render and execution
    fetchSamples().then(() => {
      renderProcessTable();
      runComparison();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
