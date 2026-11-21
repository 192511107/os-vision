/**
 * OS-Vision: Module 3 - Scheduling Performance Analysis Script
 * Interactive visual analytics, execution statistics, and dynamically calculated insights.
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
  let currentComparison = null;

  // Distinct algorithm color tokens
  const algoColors = {
    fcfs: { fill: 'linear-gradient(180deg, #06b6d4, #0891b2)', border: '#22d3ee', solid: '#06b6d4' },
    sjf: { fill: 'linear-gradient(180deg, #10b981, #059669)', border: '#34d399', solid: '#10b981' },
    srtf: { fill: 'linear-gradient(180deg, #8b5cf6, #7c3aed)', border: '#a78bfa', solid: '#8b5cf6' },
    priority: { fill: 'linear-gradient(180deg, #3b82f6, #2563eb)', border: '#60a5fa', solid: '#3b82f6' },
    rr: { fill: 'linear-gradient(180deg, #f59e0b, #d97706)', border: '#fbbf24', solid: '#f59e0b' }
  };

  // --- DOM Elements ---
  const workloadPresetSelect = document.getElementById('workloadPresetSelect');
  const applyPresetBtn = document.getElementById('applyPresetBtn');
  const analysisQuantumInput = document.getElementById('analysisQuantumInput');
  const toggleEditorBtn = document.getElementById('toggleEditorBtn');
  const recalculateBtn = document.getElementById('recalculateBtn');
  const workloadEditorPanel = document.getElementById('workloadEditorPanel');
  const editorTableBody = document.getElementById('editorTableBody');
  const editorAddBtn = document.getElementById('editorAddBtn');
  const editorResetBtn = document.getElementById('editorResetBtn');

  // Summary Pill Elements
  const summaryProcCount = document.getElementById('summaryProcCount');
  const summaryTotalBurst = document.getElementById('summaryTotalBurst');
  const summaryArrivalSpan = document.getElementById('summaryArrivalSpan');
  const summaryQuantum = document.getElementById('summaryQuantum');

  // Chart Containers
  const chartWaitingTime = document.getElementById('chartWaitingTime');
  const chartTurnaroundTime = document.getElementById('chartTurnaroundTime');
  const chartResponseTime = document.getElementById('chartResponseTime');
  const chartCpuUtil = document.getElementById('chartCpuUtil');

  // Chart Header Badges
  const chart1WinnerBadge = document.getElementById('chart1WinnerBadge');
  const chart2WinnerBadge = document.getElementById('chart2WinnerBadge');
  const chart3WinnerBadge = document.getElementById('chart3WinnerBadge');

  // Stats Elements
  const statTotalBurst = document.getElementById('statTotalBurst');
  const statBurstSub = document.getElementById('statBurstSub');
  const statMakespan = document.getElementById('statMakespan');
  const statMakespanSub = document.getElementById('statMakespanSub');
  const statPreemptions = document.getElementById('statPreemptions');
  const statPreemptionsSub = document.getElementById('statPreemptionsSub');
  const statIdleTime = document.getElementById('statIdleTime');
  const statIdleSub = document.getElementById('statIdleSub');
  const statSpread = document.getElementById('statSpread');
  const statSpreadSub = document.getElementById('statSpreadSub');
  const statThroughput = document.getElementById('statThroughput');
  const statThroughputSub = document.getElementById('statThroughputSub');

  // Insights List Container
  const insightsList = document.getElementById('insightsList');

  // --- Update Summary Pills ---
  function updateSummaryPills() {
    const totalBurst = processes.reduce((acc, p) => acc + (Number(p.burstTime) || 0), 0);
    const minArr = processes.length > 0 ? Math.min(...processes.map(p => Number(p.arrivalTime) || 0)) : 0;
    const maxArr = processes.length > 0 ? Math.max(...processes.map(p => Number(p.arrivalTime) || 0)) : 0;

    if (summaryProcCount) summaryProcCount.textContent = processes.length;
    if (summaryTotalBurst) summaryTotalBurst.textContent = `${totalBurst} ms`;
    if (summaryArrivalSpan) summaryArrivalSpan.textContent = `t=${minArr} to t=${maxArr}`;
    if (summaryQuantum) summaryQuantum.textContent = `${timeQuantum} ms`;
  }

  // --- Render Workload Editor Rows ---
  function renderEditorTable() {
    if (!editorTableBody) return;
    editorTableBody.innerHTML = '';

    if (processes.length === 0) {
      editorTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.25rem;">
            No processes in workload. Click "+ Add Row" above to create processes.
          </td>
        </tr>
      `;
      return;
    }

    processes.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="text" class="proc-edit-field edit-pid" data-index="${idx}" value="${escapeHtml(p.pid)}" style="width: 75px; padding: 0.3rem 0.5rem; background: var(--bg-darkest); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: #fff; font-weight: 700;">
        </td>
        <td>
          <input type="number" min="0" class="proc-edit-field edit-arrival" data-index="${idx}" value="${p.arrivalTime}" style="width: 75px; padding: 0.3rem 0.5rem; background: var(--bg-darkest); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: #fff;">
        </td>
        <td>
          <input type="number" min="1" class="proc-edit-field edit-burst" data-index="${idx}" value="${p.burstTime}" style="width: 75px; padding: 0.3rem 0.5rem; background: var(--bg-darkest); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: #fff;">
        </td>
        <td>
          <input type="number" class="proc-edit-field edit-priority" data-index="${idx}" value="${p.priority}" style="width: 75px; padding: 0.3rem 0.5rem; background: var(--bg-darkest); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: #fff;">
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn-icon-sm btn-del-edit-row" data-index="${idx}" style="color: #f87171;" title="Remove process">
            &times;
          </button>
        </td>
      `;
      editorTableBody.appendChild(tr);
    });

    // Listeners for input change
    document.querySelectorAll('.proc-edit-field').forEach(input => {
      input.addEventListener('change', () => {
        const idx = parseInt(input.dataset.index, 10);
        if (isNaN(idx) || idx < 0 || idx >= processes.length) return;

        if (input.classList.contains('edit-pid')) {
          processes[idx].pid = input.value.trim().toUpperCase() || `P${idx + 1}`;
        } else if (input.classList.contains('edit-arrival')) {
          processes[idx].arrivalTime = Math.max(0, Number(input.value) || 0);
        } else if (input.classList.contains('edit-burst')) {
          processes[idx].burstTime = Math.max(1, Number(input.value) || 1);
        } else if (input.classList.contains('edit-priority')) {
          processes[idx].priority = Number(input.value) || 1;
        }

        updateSummaryPills();
      });
    });

    // Delete row listener
    document.querySelectorAll('.btn-del-edit-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx) && idx >= 0 && idx < processes.length) {
          processes.splice(idx, 1);
          renderEditorTable();
          updateSummaryPills();
          runAnalysis();
        }
      });
    });
  }

  // --- Run Simulation Analysis API ---
  async function runAnalysis() {
    if (processes.length === 0) {
      if (window.showToast) window.showToast('Please add at least one process to run analysis.', 'warning');
      return;
    }

    if (recalculateBtn) {
      recalculateBtn.classList.add('loading');
      recalculateBtn.disabled = true;
    }

    const tq = Number(analysisQuantumInput ? analysisQuantumInput.value : 2) || 2;
    timeQuantum = tq;
    updateSummaryPills();

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
        throw new Error(data.error || 'Failed to simulate scheduling analysis.');
      }

      currentComparison = data;
      renderAllCharts(data.comparison);
      renderExecutionStats(data);
      renderDynamicInsights(data);
    } catch (err) {
      console.error('[Scheduling Analysis Error]:', err);
      if (window.showToast) {
        window.showToast(err.message || 'Error executing scheduling analysis.', 'error');
      }
    } finally {
      if (recalculateBtn) {
        recalculateBtn.classList.remove('loading');
        recalculateBtn.disabled = false;
      }
    }
  }

  // --- Render Visual Performance Charts ---
  function renderAllCharts(comparisonList) {
    if (!comparisonList || comparisonList.length === 0) return;

    // 1. Average Waiting Time Chart
    renderBarChart({
      container: chartWaitingTime,
      data: comparisonList.map(c => ({
        key: c.algorithmKey,
        label: c.algorithmKey.toUpperCase(),
        value: c.avgWaitingTime,
        unit: 'ms'
      })),
      metricLabel: 'Avg Waiting Time',
      highlightBestLowest: true,
      winnerBadge: chart1WinnerBadge
    });

    // 2. Average Turnaround Time Chart
    renderBarChart({
      container: chartTurnaroundTime,
      data: comparisonList.map(c => ({
        key: c.algorithmKey,
        label: c.algorithmKey.toUpperCase(),
        value: c.avgTurnaroundTime,
        unit: 'ms'
      })),
      metricLabel: 'Avg Turnaround Time',
      highlightBestLowest: true,
      winnerBadge: chart2WinnerBadge
    });

    // 3. Average Response Time Chart
    renderBarChart({
      container: chartResponseTime,
      data: comparisonList.map(c => ({
        key: c.algorithmKey,
        label: c.algorithmKey.toUpperCase(),
        value: c.avgResponseTime,
        unit: 'ms'
      })),
      metricLabel: 'Avg Response Time',
      highlightBestLowest: true,
      winnerBadge: chart3WinnerBadge
    });

    // 4. CPU Utilization & Throughput Chart
    renderBarChart({
      container: chartCpuUtil,
      data: comparisonList.map(c => ({
        key: c.algorithmKey,
        label: c.algorithmKey.toUpperCase(),
        value: c.cpuUtilization,
        unit: '%'
      })),
      metricLabel: 'CPU Utilization',
      highlightBestLowest: false,
      winnerBadge: null,
      maxScale: 100
    });
  }

  // --- Generic Pure-CSS/SVG Interactive Bar Chart Generator ---
  function renderBarChart(options) {
    const { container, data, metricLabel, highlightBestLowest, winnerBadge, maxScale } = options;
    if (!container) return;
    container.innerHTML = '';

    const values = data.map(d => d.value);
    const maxValue = maxScale !== undefined ? maxScale : Math.max(...values, 0.1);
    const bestValue = highlightBestLowest ? Math.min(...values) : Math.max(...values);

    // Update winner badge if element provided
    if (winnerBadge) {
      const winners = data.filter(d => d.value === bestValue);
      winnerBadge.textContent = winners.length > 1
        ? `Tie: ${winners.map(w => w.label).join(', ')} (${bestValue.toFixed(2)} ms)`
        : `Best: ${winners[0].label} (${bestValue.toFixed(2)} ms)`;
    }

    const wrap = document.createElement('div');
    wrap.className = 'bar-chart-bars-wrap';

    // Gridlines (0%, 25%, 50%, 75%, 100%)
    const gridlines = document.createElement('div');
    gridlines.className = 'bar-chart-gridlines';
    [1, 0.75, 0.5, 0.25, 0].forEach(fraction => {
      const line = document.createElement('div');
      line.className = 'bar-chart-gridline';
      const labelVal = (maxValue * fraction).toFixed(fraction === 0 ? 0 : 1);
      line.innerHTML = `<span>${labelVal}</span>`;
      gridlines.appendChild(line);
    });
    wrap.appendChild(gridlines);

    // Bar items
    data.forEach(item => {
      const heightPercent = maxValue > 0 ? Math.max(3, (item.value / maxValue) * 100) : 3;
      const isBest = item.value === bestValue;
      const colorScheme = algoColors[item.key] || { fill: 'var(--accent-blue)', solid: '#3b82f6' };

      const col = document.createElement('div');
      col.className = 'bar-col-item';

      col.innerHTML = `
        <div class="bar-val-label" style="${isBest ? 'color: var(--accent-emerald); font-weight: 800;' : ''}">
          ${item.value.toFixed(2)}${item.unit === '%' ? '%' : ''}
          ${isBest ? '★' : ''}
        </div>
        <div class="bar-pillar" style="height: ${heightPercent}%; background: ${isBest ? 'linear-gradient(180deg, #10b981, #059669)' : colorScheme.fill}; border: 1px solid ${isBest ? '#34d399' : colorScheme.border};"></div>
        <div class="bar-label-name" style="${isBest ? 'color: #fff; font-weight: 700;' : ''}">
          ${escapeHtml(item.label)}
        </div>
      `;

      // Tooltip hover
      col.title = `${item.label} ${metricLabel}: ${item.value.toFixed(2)} ${item.unit}`;
      wrap.appendChild(col);
    });

    container.appendChild(wrap);
  }

  // --- Render Execution Statistics ---
  function renderExecutionStats(data) {
    const comparison = data.comparison;
    const results = data.results;
    if (!comparison || comparison.length === 0) return;

    // Total Workload Demand
    const totalBurst = processes.reduce((acc, p) => acc + Number(p.burstTime), 0);
    if (statTotalBurst) statTotalBurst.textContent = `${totalBurst} ms`;
    if (statBurstSub) statBurstSub.textContent = `Sum across ${processes.length} processes`;

    // Makespan Range
    const makespans = comparison.map(c => c.totalTime);
    const minMakespan = Math.min(...makespans);
    const maxMakespan = Math.max(...makespans);
    if (statMakespan) {
      statMakespan.textContent = minMakespan === maxMakespan ? `${minMakespan} ms` : `${minMakespan} - ${maxMakespan} ms`;
    }
    if (statMakespanSub) {
      statMakespanSub.textContent = minMakespan === maxMakespan ? 'Identical makespan for all algorithms' : 'Varies based on arrival gaps';
    }

    // Preemption / Context Switches
    const rrContextSwitches = comparison.find(c => c.algorithmKey === 'rr')?.contextSwitches || 0;
    const srtfContextSwitches = comparison.find(c => c.algorithmKey === 'srtf')?.contextSwitches || 0;
    const maxPreemptions = Math.max(rrContextSwitches, srtfContextSwitches);
    if (statPreemptions) statPreemptions.textContent = `${maxPreemptions}`;
    if (statPreemptionsSub) {
      statPreemptionsSub.textContent = `RR (q=${data.timeQuantum}): ${rrContextSwitches} sw, SRTF: ${srtfContextSwitches} sw`;
    }

    // CPU Idle Duration
    const idleTimes = comparison.map(c => c.idleTime);
    const maxIdle = Math.max(...idleTimes);
    if (statIdleTime) statIdleTime.textContent = `${maxIdle} ms`;
    if (statIdleSub) {
      statIdleSub.textContent = maxIdle === 0 ? 'Zero idle periods (100% busy)' : 'Arrival delay forced CPU wait';
    }

    // Waiting Time Spread
    const wts = comparison.map(c => c.avgWaitingTime);
    const minWt = Math.min(...wts);
    const maxWt = Math.max(...wts);
    const spread = Math.round((maxWt - minWt) * 100) / 100;
    if (statSpread) statSpread.textContent = `${spread} ms`;
    if (statSpreadSub) {
      statSpreadSub.textContent = `Min: ${minWt.toFixed(2)} ms vs Max: ${maxWt.toFixed(2)} ms`;
    }

    // Throughput Range
    const throughs = comparison.map(c => c.throughput);
    const minTp = Math.min(...throughs);
    const maxTp = Math.max(...throughs);
    if (statThroughput) {
      statThroughput.textContent = minTp === maxTp ? `${minTp.toFixed(4)}` : `${minTp.toFixed(3)} - ${maxTp.toFixed(3)}`;
    }
    if (statThroughputSub) {
      statThroughputSub.textContent = 'Processes dispatched per millisecond';
    }
  }

  // --- Dynamic Workload Insights Generator (Strictly Calculated) ---
  function renderDynamicInsights(data) {
    if (!insightsList) return;
    insightsList.innerHTML = '';

    const comparison = data.comparison;
    const results = data.results;
    if (!comparison || comparison.length === 0) return;

    // 1. Lowest Waiting Time Winner & Reduction Percentage
    const minWt = Math.min(...comparison.map(c => c.avgWaitingTime));
    const maxWt = Math.max(...comparison.map(c => c.avgWaitingTime));
    const wtWinners = comparison.filter(c => c.avgWaitingTime === minWt);
    const wtLosers = comparison.filter(c => c.avgWaitingTime === maxWt);

    const winnerNames = wtWinners.map(w => w.algorithmName.split('(')[0].trim()).join(' and ');
    const loserNames = wtLosers.map(l => l.algorithmName.split('(')[0].trim()).join(' and ');
    const reductionPercent = maxWt > 0 ? Math.round(((maxWt - minWt) / maxWt) * 1000) / 10 : 0;

    let wtInsightText = '';
    if (minWt === maxWt) {
      wtInsightText = `All 5 scheduling algorithms achieved identical average waiting times of <strong>${minWt.toFixed(2)} ms</strong> on this workload. This occurs when processes either execute without queuing contention or share identical arrival and burst profiles.`;
    } else {
      wtInsightText = `For this specific process workload, <strong>${winnerNames}</strong> achieved the minimal average waiting time of <strong>${minWt.toFixed(2)} ms</strong>, yielding an empirical <strong>${reductionPercent}% latency reduction</strong> compared to ${loserNames} (${maxWt.toFixed(2)} ms). By prioritizing tasks with smaller burst requirements, the ready queue backlog is cleared earlier.`;
    }

    addInsightCard({
      type: 'insight-winner',
      icon: '&#127942;',
      title: 'Minimal Average Waiting Time & Queue Efficiency',
      text: wtInsightText,
      tags: [
        { label: `Optimal: ${wtWinners.map(w => w.algorithmKey.toUpperCase()).join('/')}`, class: 'badge-emerald' },
        { label: `Reduction: ${reductionPercent}%`, class: 'badge-cyan' },
        { label: `Spread: ${(maxWt - minWt).toFixed(2)} ms`, class: 'badge-blue' }
      ]
    });

    // 2. Convoy Effect Analysis
    const fcfsItem = comparison.find(c => c.algorithmKey === 'fcfs');
    const sjfItem = comparison.find(c => c.algorithmKey === 'sjf');
    const firstProc = processes[0];
    const avgOtherBurst = processes.length > 1
      ? processes.slice(1).reduce((acc, p) => acc + Number(p.burstTime), 0) / (processes.length - 1)
      : 0;

    let convoyDetected = false;
    let convoyText = '';

    if (
      fcfsItem && sjfItem &&
      firstProc &&
      Number(firstProc.burstTime) >= 2 * avgOtherBurst &&
      fcfsItem.avgWaitingTime >= 1.4 * sjfItem.avgWaitingTime &&
      processes.length >= 3
    ) {
      convoyDetected = true;
      convoyText = `<strong>Convoy Effect Detected:</strong> Process <strong>${escapeHtml(firstProc.pid)}</strong> arrived at t=${firstProc.arrivalTime} with a substantial burst of <strong>${firstProc.burstTime} ms</strong>, monopolizing the CPU while subsequent shorter jobs were forced to wait in the ready queue. Under FCFS, average waiting time surged to <strong>${fcfsItem.avgWaitingTime.toFixed(2)} ms</strong>, whereas SJF bypassed this head-of-line blockage to achieve <strong>${sjfItem.avgWaitingTime.toFixed(2)} ms</strong>.`;
    } else {
      convoyText = `<strong>Convoy Effect Absent:</strong> The process burst times and arrival intervals are relatively uniform. Head-of-line blocking under FCFS is mitigated (FCFS Avg WT: <strong>${fcfsItem ? fcfsItem.avgWaitingTime.toFixed(2) : '--'} ms</strong> vs SJF Avg WT: <strong>${sjfItem ? sjfItem.avgWaitingTime.toFixed(2) : '--'} ms</strong>).`;
    }

    addInsightCard({
      type: convoyDetected ? 'insight-convoy' : 'insight-item',
      icon: convoyDetected ? '&#9888;' : '&#9989;',
      title: 'Convoy Effect & Head-of-Line Blocking Evaluation',
      text: convoyText,
      tags: [
        { label: convoyDetected ? 'Anomaly: Convoy Latency' : 'Queue Health: Balanced', class: convoyDetected ? 'badge-amber' : 'badge-emerald' },
        { label: `FCFS WT: ${fcfsItem ? fcfsItem.avgWaitingTime.toFixed(2) : '--'} ms`, class: 'badge-cyan' },
        { label: `SJF WT: ${sjfItem ? sjfItem.avgWaitingTime.toFixed(2) : '--'} ms`, class: 'badge-blue' }
      ]
    });

    // 3. Interactive Responsiveness & Round Robin Time-Slicing
    const rrItem = comparison.find(c => c.algorithmKey === 'rr');
    if (rrItem && fcfsItem) {
      const rrPreempts = rrItem.contextSwitches;
      const respDelta = Math.round((fcfsItem.avgResponseTime - rrItem.avgResponseTime) * 100) / 100;
      let rrText = '';

      if (respDelta > 0) {
        rrText = `Round Robin (time quantum <strong>q = ${data.timeQuantum} ms</strong>) improved initial response latency by <strong>${respDelta.toFixed(2)} ms</strong> compared to FCFS (${rrItem.avgResponseTime.toFixed(2)} ms vs ${fcfsItem.avgResponseTime.toFixed(2)} ms), requiring <strong>${rrPreempts} context switches</strong>. This illustrates the classic OS design trade-off: preemptive circular scheduling guarantees responsiveness for interactive tasks at the cost of context switching overhead.`;
      } else {
        rrText = `Round Robin executed with a time quantum of <strong>q = ${data.timeQuantum} ms</strong> and an average response time of <strong>${rrItem.avgResponseTime.toFixed(2)} ms</strong> with <strong>${rrPreempts} total context switches</strong>. Because processes arrived simultaneously or burst times fit within the quantum slice, response times closely matched non-preemptive baseline dispatching.`;
      }

      addInsightCard({
        type: 'insight-rr',
        icon: '&#128257;',
        title: 'Round Robin Responsiveness & Context Switching Overhead',
        text: rrText,
        tags: [
          { label: `Quantum: ${data.timeQuantum} ms`, class: 'badge-purple' },
          { label: `Avg Response: ${rrItem.avgResponseTime.toFixed(2)} ms`, class: 'badge-cyan' },
          { label: `Preemptions: ${rrPreempts}`, class: 'badge-amber' }
        ]
      });
    }

    // 4. Preemption Dynamics (SRTF vs Non-Preemptive SJF)
    const srtfItem = comparison.find(c => c.algorithmKey === 'srtf');
    if (srtfItem && sjfItem) {
      const srtfPreempts = srtfItem.contextSwitches;
      let preemptText = '';

      if (srtfPreempts > 0) {
        preemptText = `<strong>Active Preemption Verified:</strong> Mid-execution arrivals triggered <strong>${srtfPreempts} preemption event(s)</strong> under SRTF when incoming tasks had strictly shorter remaining burst times than the running process. This produced an average turnaround time of <strong>${srtfItem.avgTurnaroundTime.toFixed(2)} ms</strong> (vs SJF: <strong>${sjfItem.avgTurnaroundTime.toFixed(2)} ms</strong>).`;
      } else {
        preemptText = `<strong>Zero Preemption Events:</strong> Under SRTF, newly arriving processes did not possess a remaining burst duration shorter than the active job at their arrival moments. Consequently, SRTF produced an execution schedule identical to non-preemptive SJF (Both Avg WT: <strong>${srtfItem.avgWaitingTime.toFixed(2)} ms</strong>).`;
      }

      addInsightCard({
        type: srtfPreempts > 0 ? 'insight-preempt' : 'insight-item',
        icon: '&#9889;',
        title: 'Preemptive Dispatch Dynamic (SRTF vs SJF)',
        text: preemptText,
        tags: [
          { label: srtfPreempts > 0 ? 'Preemption: Active' : 'Preemption: Inactive', class: srtfPreempts > 0 ? 'badge-purple' : 'badge-blue' },
          { label: `SRTF TAT: ${srtfItem.avgTurnaroundTime.toFixed(2)} ms`, class: 'badge-cyan' },
          { label: `SJF TAT: ${sjfItem.avgTurnaroundTime.toFixed(2)} ms`, class: 'badge-emerald' }
        ]
      });
    }

    // 5. CPU Saturation & Arrival Delays
    const maxIdle = Math.max(...comparison.map(c => c.idleTime));
    const avgUtil = Math.round(comparison.reduce((acc, c) => acc + c.cpuUtilization, 0) / comparison.length * 10) / 10;
    let utilText = '';

    if (maxIdle > 0) {
      utilText = `<strong>CPU Idle Bubbles Detected:</strong> Due to gaps between process arrival times, the CPU remained idle for <strong>${maxIdle} ms</strong> before pending jobs entered the ready queue. Average CPU utilization across algorithms was measured at <strong>${avgUtil}%</strong>.`;
    } else {
      utilText = `<strong>100% Continuous CPU Saturation:</strong> Across all 5 scheduling algorithms, the CPU operated with zero idle slots. The process arrival timestamps ensured that at least one ready process was continually available for execution until final termination.`;
    }

    addInsightCard({
      type: maxIdle > 0 ? 'insight-convoy' : 'insight-winner',
      icon: maxIdle > 0 ? '&#9208;' : '&#9889;',
      title: 'CPU Resource Saturation & Idle Gap Analysis',
      text: utilText,
      tags: [
        { label: `CPU Utilization: ${avgUtil}%`, class: 'badge-emerald' },
        { label: `Idle Time: ${maxIdle} ms`, class: maxIdle > 0 ? 'badge-amber' : 'badge-blue' }
      ]
    });
  }

  // Helper to add insight card
  function addInsightCard(card) {
    if (!insightsList) return;
    const div = document.createElement('div');
    div.className = `insight-item ${card.type || ''}`;
    div.innerHTML = `
      <div class="insight-icon">${card.icon}</div>
      <div class="insight-content">
        <h5>${card.title}</h5>
        <p>${card.text}</p>
        <div class="insight-meta-tags">
          ${card.tags.map(t => `<span class="badge ${t.class}">${escapeHtml(t.label)}</span>`).join('')}
        </div>
      </div>
    `;
    insightsList.appendChild(div);
  }

  // --- Load Preset Workloads ---
  async function loadPreset() {
    const selectedId = workloadPresetSelect ? workloadPresetSelect.value : 'standard-mix';
    const found = sampleScenarios.find(s => s.id === selectedId);
    if (found) {
      processes = found.processes.map(p => ({ ...p }));
      if (analysisQuantumInput && found.timeQuantum) {
        analysisQuantumInput.value = found.timeQuantum;
      }
      renderEditorTable();
      updateSummaryPills();
      runAnalysis();
      if (window.showToast) {
        window.showToast(`Loaded preset workload: ${found.name}`, 'info');
      }
    } else {
      resetDefault();
    }
  }

  function resetDefault() {
    processes = [
      { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
      { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { pid: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
      { pid: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 }
    ];
    if (analysisQuantumInput) analysisQuantumInput.value = 2;
    renderEditorTable();
    updateSummaryPills();
    runAnalysis();
  }

  // --- Fetch Samples ---
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
      console.warn('Samples fetch failed:', err);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Initialize Listeners ---
  function init() {
    if (recalculateBtn) {
      recalculateBtn.addEventListener('click', runAnalysis);
    }

    if (applyPresetBtn) {
      applyPresetBtn.addEventListener('click', loadPreset);
    }

    if (workloadPresetSelect) {
      workloadPresetSelect.addEventListener('change', loadPreset);
    }

    if (toggleEditorBtn && workloadEditorPanel) {
      toggleEditorBtn.addEventListener('click', () => {
        const isHidden = workloadEditorPanel.style.display === 'none';
        workloadEditorPanel.style.display = isHidden ? 'block' : 'none';
        toggleEditorBtn.innerHTML = isHidden ? '&#10005; Hide Editor' : '&#9998; Customize Workload';
      });
    }

    if (editorAddBtn) {
      editorAddBtn.addEventListener('click', () => {
        const nextNum = processes.length + 1;
        processes.push({
          pid: `P${nextNum}`,
          arrivalTime: 0,
          burstTime: 4,
          priority: 2
        });
        renderEditorTable();
        updateSummaryPills();
      });
    }

    if (editorResetBtn) {
      editorResetBtn.addEventListener('click', resetDefault);
    }

    if (analysisQuantumInput) {
      analysisQuantumInput.addEventListener('change', () => {
        const val = Number(analysisQuantumInput.value);
        if (val > 0) {
          timeQuantum = val;
          updateSummaryPills();
          runAnalysis();
        }
      });
    }

    // Initial render and execution
    fetchSamples().then(() => {
      renderEditorTable();
      updateSummaryPills();
      runAnalysis();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
