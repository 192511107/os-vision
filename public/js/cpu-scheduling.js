/**
 * OS-Vision: CPU Scheduling Module Interactivity & Simulation Visualizer
 * Stage 2 Complete Implementation
 */

(function () {
  'use strict';

  // State
  let currentAlgorithm = 'fcfs';
  let timeQuantum = 2;
  let editingIndex = null;
  let processes = [
    { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
    { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
    { pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
    { pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 }
  ];
  let sampleScenarios = [];

  // Color mapping palette for process Gantt visualization
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

  // DOM Elements
  const algoTabs = document.querySelectorAll('.algo-tab');
  const algoInfoContainer = document.getElementById('algoInfoContainer');
  const quantumGroup = document.getElementById('quantumGroup');
  const timeQuantumInput = document.getElementById('timeQuantumInput');
  const processTableBody = document.getElementById('processTableBody');
  const addProcessBtn = document.getElementById('addProcessBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const runSimulationBtn = document.getElementById('runSimulationBtn');
  const resetProcessesBtn = document.getElementById('resetProcessesBtn');
  const clearProcessesBtn = document.getElementById('clearProcessesBtn');
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  const presetSelect = document.getElementById('presetSelect');
  const errorAlert = document.getElementById('errorAlert');
  const errorAlertText = document.getElementById('errorAlertText');

  // Input Fields
  const inputPid = document.getElementById('inputPid');
  const inputArrival = document.getElementById('inputArrival');
  const inputBurst = document.getElementById('inputBurst');
  const inputPriority = document.getElementById('inputPriority');

  // Visualization & Results Elements
  const ganttChartCanvas = document.getElementById('ganttChartCanvas');
  const ganttTimelineMarkers = document.getElementById('ganttTimelineMarkers');
  const ganttLegend = document.getElementById('ganttLegend');
  const resultsTableBody = document.getElementById('resultsTableBody');
  const metricAvgTat = document.getElementById('metricAvgTat');
  const metricAvgWt = document.getElementById('metricAvgWt');
  const metricAvgRt = document.getElementById('metricAvgRt');
  const metricCpuUtil = document.getElementById('metricCpuUtil');
  const metricThroughput = document.getElementById('metricThroughput');
  const scheduleLengthText = document.getElementById('scheduleLengthText');
  const idleTimeText = document.getElementById('idleTimeText');

  // Algorithm summaries for info header
  const algorithmMeta = {
    'fcfs': {
      title: 'First-Come, First-Served (FCFS)',
      type: 'Non-Preemptive',
      complexity: 'O(N)',
      summary: 'Executes processes strictly in order of their arrival timestamp. Straightforward implementation, but vulnerable to the convoy effect where short tasks wait behind lengthy ones.'
    },
    'sjf': {
      title: 'Shortest Job First (SJF)',
      type: 'Non-Preemptive',
      complexity: 'O(N log N)',
      summary: 'Dispatches the waiting process with the smallest CPU burst time. Proven to yield minimal average waiting time for non-preemptive workloads.'
    },
    'srtf': {
      title: 'Shortest Remaining Time First (SRTF)',
      type: 'Preemptive',
      complexity: 'O(N log N)',
      summary: 'Preemptive SJF where the CPU immediately switches to newly arrived processes having strictly shorter remaining burst times than the running process.'
    },
    'rr': {
      title: 'Round Robin (RR)',
      type: 'Preemptive',
      complexity: 'O(1) per switch',
      summary: 'Distributes fixed CPU slices (time quantum) across a circular FIFO queue. Eliminates starvation and guarantees responsive interactive performance.'
    },
    'priority': {
      title: 'Priority Scheduling',
      type: 'Non-Preemptive',
      complexity: 'O(N)',
      summary: 'Dispatches processes according to priority level (lower numerical value = higher priority). Equal priority ties are resolved by arrival timestamp.'
    }
  };

  // Helper to suggest next PID
  function getNextSuggestedPid() {
    let maxNum = 0;
    processes.forEach(p => {
      const match = String(p.pid).match(/^P(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    return `P${maxNum + 1}`;
  }

  // --- Initializer ---
  async function init() {
    setupAlgorithmTabs();
    setupProcessForm();
    setupPresetLoader();
    renderProcessTable();
    cancelEditing();
    await fetchPresets();
    runSimulation();
  }

  // --- Fetch Presets from Server ---
  async function fetchPresets() {
    try {
      const res = await fetch('/api/cpu-scheduling/samples');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.samples)) {
          sampleScenarios = data.samples;
          populatePresetDropdown(data.samples);
        }
      }
    } catch (err) {
      console.warn('Could not load sample presets from API:', err);
    }
  }

  function populatePresetDropdown(samples) {
    if (!presetSelect) return;
    presetSelect.innerHTML = '<option value="">-- Choose Sample Preset Scenario --</option>';
    samples.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.recommendedAlgorithm.toUpperCase()})`;
      presetSelect.appendChild(opt);
    });
  }

  function loadScenario(found) {
    if (!found) return;
    processes = JSON.parse(JSON.stringify(found.processes));
    currentAlgorithm = found.recommendedAlgorithm || 'fcfs';
    if (found.timeQuantum) {
      timeQuantum = found.timeQuantum;
      if (timeQuantumInput) timeQuantumInput.value = timeQuantum;
    }

    // Update active tab
    algoTabs.forEach(tab => {
      if (tab.dataset.algo === currentAlgorithm) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    cancelEditing();
    updateAlgorithmView();
    renderProcessTable();
    hideError();
    runSimulation();

    if (window.showToast) {
      window.showToast(`Loaded preset: ${found.name}`, 'info');
    }
  }

  // --- Preset Selection Handler ---
  function setupPresetLoader() {
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const id = e.target.value;
        if (!id) return;
        const found = sampleScenarios.find(s => s.id === id);
        if (found) {
          loadScenario(found);
        }
      });
    }

    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let target = null;
        if (presetSelect && presetSelect.value) {
          target = sampleScenarios.find(s => s.id === presetSelect.value);
        }
        if (!target && sampleScenarios.length > 0) {
          target = sampleScenarios[0];
          if (presetSelect) presetSelect.value = target.id;
        }
        if (target) {
          loadScenario(target);
        } else {
          showError('No sample preset scenario available.');
        }
      });
    }
  }

  // --- Algorithm Tabs Setup ---
  function setupAlgorithmTabs() {
    algoTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        algoTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentAlgorithm = tab.dataset.algo;
        updateAlgorithmView();
        hideError();
        runSimulation();
      });
    });

    if (timeQuantumInput) {
      const handleQuantumChange = () => {
        const val = Number(timeQuantumInput.value);
        if (Number.isFinite(val) && val > 0) {
          timeQuantum = val;
          hideError();
          if (currentAlgorithm === 'rr') {
            runSimulation();
          }
        } else if (timeQuantumInput.value !== '') {
          showError('Time quantum must be a positive number greater than zero.');
        }
      };
      timeQuantumInput.addEventListener('change', handleQuantumChange);
      timeQuantumInput.addEventListener('input', handleQuantumChange);
    }
  }

  function updateAlgorithmView() {
    const meta = algorithmMeta[currentAlgorithm];
    if (meta && algoInfoContainer) {
      algoInfoContainer.innerHTML = `
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

    if (quantumGroup) {
      if (currentAlgorithm === 'rr') {
        quantumGroup.style.display = 'flex';
      } else {
        quantumGroup.style.display = 'none';
      }
    }
  }

  // --- Process Input Form Setup ---
  function setupProcessForm() {
    if (addProcessBtn) {
      addProcessBtn.addEventListener('click', handleAddOrSaveProcess);
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', cancelEditing);
    }

    if (resetProcessesBtn) {
      resetProcessesBtn.addEventListener('click', resetToDefaultProcesses);
    }

    if (clearProcessesBtn) {
      clearProcessesBtn.addEventListener('click', clearAllProcesses);
    }

    if (runSimulationBtn) {
      runSimulationBtn.addEventListener('click', runSimulation);
    }

    // Auto-advance process ID helper on Enter key
    [inputPid, inputArrival, inputBurst, inputPriority].forEach(input => {
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAddOrSaveProcess();
          }
        });
      }
    });
  }

  function clearProcessInputs() {
    editingIndex = null;
    if (inputPid) inputPid.value = '';
    if (inputArrival) inputArrival.value = '';
    if (inputBurst) inputBurst.value = '';
    if (inputPriority) inputPriority.value = '';

    if (addProcessBtn) {
      addProcessBtn.textContent = '+ Add Process';
      addProcessBtn.className = 'btn btn-primary';
    }
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
  }

  function handleAddOrSaveProcess() {
    const pid = String(inputPid ? inputPid.value : '').trim();
    const arrivalVal = inputArrival ? String(inputArrival.value).trim() : '';
    const burstVal = inputBurst ? String(inputBurst.value).trim() : '';
    const priorityVal = inputPriority ? String(inputPriority.value).trim() : '';

    // Validation
    if (!pid) {
      showError('Please enter a valid Process ID (e.g. P1, P5).');
      if (inputPid) inputPid.focus();
      return;
    }

    const isDuplicate = processes.some((p, idx) => {
      if (editingIndex !== null && idx === editingIndex) return false;
      return p.pid.toLowerCase() === pid.toLowerCase();
    });

    if (isDuplicate) {
      showError(`Process ID '${pid}' is already in use. Process IDs must be unique.`);
      if (inputPid) inputPid.focus();
      return;
    }

    if (arrivalVal === '') {
      showError('Please specify an Arrival Time.');
      if (inputArrival) inputArrival.focus();
      return;
    }

    const arrival = Number(arrivalVal);
    if (!Number.isFinite(arrival) || arrival < 0) {
      showError('Arrival time must be a non-negative number (0 or greater).');
      if (inputArrival) inputArrival.focus();
      return;
    }

    if (burstVal === '') {
      showError('Please enter a Burst Time.');
      if (inputBurst) inputBurst.focus();
      return;
    }

    const burst = Number(burstVal);
    if (!Number.isFinite(burst) || burst <= 0) {
      showError('Burst time must be greater than zero (> 0).');
      if (inputBurst) inputBurst.focus();
      return;
    }

    let priority = 1;
    if (priorityVal !== '') {
      const pNum = Number(priorityVal);
      if (!Number.isFinite(pNum)) {
        showError('Priority must be a valid number.');
        if (inputPriority) inputPriority.focus();
        return;
      }
      priority = pNum;
    }

    hideError();

    if (editingIndex !== null) {
      // Save Edit
      processes[editingIndex] = { pid, arrivalTime: arrival, burstTime: burst, priority };
      if (window.showToast) window.showToast(`Updated process ${pid}`, 'success');
      clearProcessInputs();
    } else {
      // Add Process
      processes.push({ pid, arrivalTime: arrival, burstTime: burst, priority });
      if (window.showToast) window.showToast(`Added process ${pid}`, 'success');
      clearProcessInputs();
    }

    renderProcessTable();
    runSimulation();
  }

  function startEditingProcess(index) {
    const p = processes[index];
    if (!p) return;

    editingIndex = index;
    if (inputPid) inputPid.value = p.pid;
    if (inputArrival) inputArrival.value = p.arrivalTime;
    if (inputBurst) inputBurst.value = p.burstTime;
    if (inputPriority) inputPriority.value = p.priority !== undefined ? p.priority : 1;

    if (addProcessBtn) {
      addProcessBtn.textContent = 'Save Changes';
      addProcessBtn.className = 'btn btn-primary';
    }
    if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
    if (inputPid) inputPid.focus();
  }

  function cancelEditing() {
    clearProcessInputs();
  }

  function deleteProcess(index) {
    const removed = processes.splice(index, 1);
    if (editingIndex === index) {
      cancelEditing();
    } else if (editingIndex !== null && editingIndex > index) {
      editingIndex--;
    }
    renderProcessTable();
    if (window.showToast && removed.length > 0) {
      window.showToast(`Removed process ${removed[0].pid}`, 'info');
    }
    if (processes.length > 0) {
      runSimulation();
    } else {
      clearResults();
      showError('Process queue is empty. Add processes to run simulation.');
    }
  }

  function clearAllProcesses() {
    processes = [];
    cancelEditing();
    renderProcessTable();
    clearResults();
    if (presetSelect) presetSelect.value = '';
    showError('Process queue cleared. Add at least one process to simulate.');
    if (window.showToast) window.showToast('Cleared all processes from table', 'info');
  }

  function resetToDefaultProcesses() {
    processes = [
      { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
      { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
      { pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 }
    ];
    cancelEditing();
    renderProcessTable();
    hideError();
    if (presetSelect) presetSelect.value = '';
    runSimulation();
    if (window.showToast) window.showToast('Reset to default process set', 'info');
  }

  // --- Render Process Table ---
  function renderProcessTable() {
    if (!processTableBody) return;
    processTableBody.innerHTML = '';

    if (processes.length === 0) {
      processTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            No processes added. Click "+ Add Process" or "Load Sample Data".
          </td>
        </tr>
      `;
      return;
    }

    processes.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const color = getProcessColor(p.pid);

      tr.innerHTML = `
        <td>
          <span class="pid-badge" style="border-left: 3px solid ${color.border};">
            ${p.pid}
          </span>
        </td>
        <td>${p.arrivalTime} ms</td>
        <td>${p.burstTime} ms</td>
        <td><span class="badge ${p.priority <= 2 ? 'badge-amber' : 'badge-blue'}">${p.priority}</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn btn-secondary btn-icon-sm edit-proc-btn" data-idx="${idx}" title="Edit Process">&#9998; Edit</button>
          <button type="button" class="btn btn-secondary btn-icon-sm del-proc-btn" data-idx="${idx}" title="Delete Process" style="color: #ef4444; margin-left: 4px;">&#10005; Remove</button>
        </td>
      `;

      processTableBody.appendChild(tr);
    });

    // Wire edit / delete buttons
    processTableBody.querySelectorAll('.edit-proc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        startEditingProcess(idx);
      });
    });

    processTableBody.querySelectorAll('.del-proc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        deleteProcess(idx);
      });
    });
  }

  // --- Run Simulation via API ---
  async function runSimulation() {
    if (processes.length === 0) {
      showError('Please configure at least one process to simulate.');
      clearResults();
      return;
    }

    if (currentAlgorithm === 'rr') {
      const q = Number(timeQuantumInput ? timeQuantumInput.value : timeQuantum);
      if (!Number.isFinite(q) || q <= 0) {
        showError('Round Robin requires a positive time quantum (> 0).');
        return;
      }
      timeQuantum = q;
    }

    hideError();

    const payload = {
      algorithm: currentAlgorithm,
      processes,
      timeQuantum: currentAlgorithm === 'rr' ? timeQuantum : undefined
    };

    try {
      if (runSimulationBtn) runSimulationBtn.classList.add('loading');

      const response = await fetch('/api/cpu-scheduling/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Simulation failed.');
      }

      renderSimulationResults(data);
    } catch (err) {
      console.error('[Simulation Error]:', err);
      showError(err.message || 'An error occurred during simulation.');
    } finally {
      if (runSimulationBtn) runSimulationBtn.classList.remove('loading');
    }
  }

  // --- Render Results ---
  function renderSimulationResults(data) {
    const { gantt, processResults, metrics } = data;

    // 1. Render Metrics KPIs
    if (metricAvgTat) metricAvgTat.textContent = `${metrics.avgTurnaroundTime} ms`;
    if (metricAvgWt) metricAvgWt.textContent = `${metrics.avgWaitingTime} ms`;
    if (metricAvgRt) metricAvgRt.textContent = `${metrics.avgResponseTime} ms`;
    if (metricCpuUtil) metricCpuUtil.textContent = `${metrics.cpuUtilization}%`;
    if (metricThroughput) metricThroughput.textContent = `${metrics.throughput} /ms`;
    if (scheduleLengthText) scheduleLengthText.textContent = `${metrics.totalTime} ms`;
    if (idleTimeText) idleTimeText.textContent = `${metrics.idleTime} ms`;

    // 2. Render Results Table
    renderResultsTable(processResults);

    // 3. Render Gantt Chart
    renderGanttChart(gantt, metrics.totalTime);

    // 4. Render Gantt Legend
    renderGanttLegend(gantt);
  }

  function renderResultsTable(results) {
    if (!resultsTableBody) return;
    resultsTableBody.innerHTML = '';

    if (!results || results.length === 0) {
      resultsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            No execution data. Configure processes and click "Run Simulation".
          </td>
        </tr>
      `;
      return;
    }

    results.forEach(p => {
      const tr = document.createElement('tr');
      const color = getProcessColor(p.pid);

      tr.innerHTML = `
        <td>
          <span class="pid-badge" style="border-left: 3px solid ${color.border};">
            ${p.pid}
          </span>
        </td>
        <td>${p.arrivalTime} ms</td>
        <td>${p.burstTime} ms</td>
        <td><span class="badge ${p.priority <= 2 ? 'badge-amber' : 'badge-blue'}">${p.priority}</span></td>
        <td><strong style="color: #fff;">${p.completionTime} ms</strong></td>
        <td><span style="color: var(--accent-cyan); font-weight: 700;">${p.turnaroundTime} ms</span></td>
        <td><span style="color: var(--accent-emerald); font-weight: 700;">${p.waitingTime} ms</span></td>
        <td><span style="color: var(--accent-purple); font-weight: 700;">${p.responseTime} ms</span></td>
      `;

      resultsTableBody.appendChild(tr);
    });
  }

  function renderGanttChart(gantt, totalTime) {
    if (!ganttChartCanvas) return;
    ganttChartCanvas.innerHTML = '';
    if (ganttTimelineMarkers) ganttTimelineMarkers.innerHTML = '';

    if (!gantt || gantt.length === 0 || totalTime <= 0) {
      ganttChartCanvas.innerHTML = '<div style="color: var(--text-muted); padding: 2rem; text-align: center;">No timeline data generated.</div>';
      return;
    }

    // Outer Gantt Bar
    const ganttBar = document.createElement('div');
    ganttBar.className = 'gantt-bar';

    // Unique time tick boundaries
    const timeTicks = new Set([0]);

    gantt.forEach(block => {
      timeTicks.add(block.start);
      timeTicks.add(block.end);

      const segment = document.createElement('div');
      segment.className = `gantt-segment ${block.isIdle ? 'idle-segment' : ''}`;
      
      const widthPercent = (block.duration / totalTime) * 100;
      segment.style.flex = `${block.duration} 0 0`;
      segment.style.minWidth = block.isIdle ? '28px' : '36px';

      const color = getProcessColor(block.pid);
      segment.style.background = color.bg;
      segment.style.borderColor = color.border;
      segment.style.color = color.text;

      // Tooltip content
      const tooltip = document.createElement('div');
      tooltip.className = 'gantt-tooltip';
      tooltip.innerHTML = `
        <strong>${block.pid === 'IDLE' ? 'CPU Idle Slot' : `Process ${block.pid}`}</strong><br>
        Interval: ${block.start} ms &rarr; ${block.end} ms<br>
        Duration: ${block.duration} ms
      `;
      segment.appendChild(tooltip);

      // Label inside block
      const label = document.createElement('span');
      label.className = 'gantt-label';
      label.textContent = block.pid;
      segment.appendChild(label);

      ganttBar.appendChild(segment);
    });

    ganttChartCanvas.appendChild(ganttBar);

    // Build timeline tick marks underneath
    const sortedTicks = Array.from(timeTicks).sort((a, b) => a - b);
    const markersRow = document.createElement('div');
    markersRow.className = 'gantt-ticks-row';

    sortedTicks.forEach((tick, idx) => {
      const marker = document.createElement('div');
      marker.className = 'gantt-tick-item';
      const percent = (tick / totalTime) * 100;
      marker.style.left = `${percent}%`;

      // Edge alignment so tick labels don't get clipped
      if (idx === 0) {
        marker.style.transform = 'translateX(0)';
      } else if (idx === sortedTicks.length - 1) {
        marker.style.transform = 'translateX(-100%)';
      } else {
        marker.style.transform = 'translateX(-50%)';
      }

      marker.innerHTML = `
        <div class="tick-line"></div>
        <span class="tick-number">${tick}</span>
      `;
      markersRow.appendChild(marker);
    });

    if (ganttTimelineMarkers) {
      ganttTimelineMarkers.appendChild(markersRow);
    }
  }

  function renderGanttLegend(gantt) {
    if (!ganttLegend) return;
    ganttLegend.innerHTML = '';

    const seen = new Set();
    const items = [];

    gantt.forEach(block => {
      if (!seen.has(block.pid)) {
        seen.add(block.pid);
        items.push(block.pid);
      }
    });

    items.sort((a, b) => {
      if (a === 'IDLE') return 1;
      if (b === 'IDLE') return -1;
      return a.localeCompare(b);
    });

    items.forEach(pid => {
      const color = getProcessColor(pid);
      const legendItem = document.createElement('div');
      legendItem.className = 'gantt-legend-item';
      legendItem.innerHTML = `
        <span class="legend-swatch" style="background: ${color.bg}; border: 1px solid ${color.border};"></span>
        <span>${pid === 'IDLE' ? 'CPU Idle Period' : pid}</span>
      `;
      ganttLegend.appendChild(legendItem);
    });
  }

  function clearResults() {
    if (ganttChartCanvas) ganttChartCanvas.innerHTML = '<div style="color:var(--text-muted); padding: 2rem; text-align: center;">No simulation run. Add processes to generate Gantt timeline.</div>';
    if (ganttTimelineMarkers) ganttTimelineMarkers.innerHTML = '';
    if (ganttLegend) ganttLegend.innerHTML = '';
    if (resultsTableBody) {
      resultsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            No execution data. Configure processes and click "Run Simulation".
          </td>
        </tr>
      `;
    }
    if (metricAvgTat) metricAvgTat.textContent = '-- ms';
    if (metricAvgWt) metricAvgWt.textContent = '-- ms';
    if (metricAvgRt) metricAvgRt.textContent = '-- ms';
    if (metricCpuUtil) metricCpuUtil.textContent = '--%';
    if (metricThroughput) metricThroughput.textContent = '-- /ms';
    if (scheduleLengthText) scheduleLengthText.textContent = '-- ms';
    if (idleTimeText) idleTimeText.textContent = '-- ms';
  }

  // --- Error Banner Helpers ---
  function showError(msg) {
    if (errorAlert && errorAlertText) {
      errorAlertText.textContent = msg;
      errorAlert.style.display = 'flex';
    }
    if (window.showToast) {
      window.showToast(msg, 'error');
    }
  }

  function hideError() {
    if (errorAlert) {
      errorAlert.style.display = 'none';
    }
  }

  // Self-initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
