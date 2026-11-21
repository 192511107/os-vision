/**
 * OS-Vision: Interactive OS Simulator
 * Module Specific Interactivity & Informational Handlers
 */

(function () {
  'use strict';

  // If on CPU Scheduling or Memory Management page, dedicated scripts handle interactivity
  if (typeof window !== 'undefined' && (
    window.location.pathname.includes('/cpu-scheduling') ||
    window.location.pathname.includes('/memory-management') ||
    document.getElementById('processTableBody') ||
    document.getElementById('memoryAllocWorkspace')
  )) {
    return;
  }

  // Algorithm tab switching on placeholder module pages
  const algoTabs = document.querySelectorAll('.algo-tab');
  const algoInfoContainer = document.getElementById('algoInfoContainer');

  const algorithmData = {
    // CPU Scheduling
    'fcfs': {
      title: 'First-Come, First-Served (FCFS)',
      type: 'Non-Preemptive',
      complexity: 'O(N)',
      summary: 'Executes processes strictly in order of their arrival. Simple to implement, but vulnerable to the convoy effect where short processes wait behind long ones.'
    },
    'sjf': {
      title: 'Shortest Job First (SJF)',
      type: 'Non-Preemptive',
      complexity: 'O(N log N)',
      summary: 'Selects the waiting process with the smallest CPU burst time. Proven to yield the minimal average waiting time, though requires future burst time estimation.'
    },
    'srtf': {
      title: 'Shortest Remaining Time First (SRTF)',
      type: 'Preemptive',
      complexity: 'O(N log N)',
      summary: 'Preemptive SJF where the CPU switches to any newly arrived process that has a shorter remaining burst time than the currently running process.'
    },
    'rr': {
      title: 'Round Robin (RR)',
      type: 'Preemptive',
      complexity: 'O(1) per switch',
      summary: 'Assigns each process a fixed time slice (quantum). Balances response times among interactive processes using a circular FIFO queue.'
    },
    'priority': {
      title: 'Priority Scheduling',
      type: 'Preemptive / Non-Preemptive',
      complexity: 'O(N)',
      summary: 'Allocates CPU to the highest priority process. Employs aging mechanisms to prevent starvation of low priority tasks.'
    },

    // Memory Management
    'first-fit': {
      title: 'First-Fit Allocation',
      type: 'Contiguous Allocation',
      complexity: 'O(N)',
      summary: 'Allocates the first free hole large enough to satisfy the requested partition size. Fast search but may leave fragmentation near the beginning.'
    },
    'best-fit': {
      title: 'Best-Fit Allocation',
      type: 'Contiguous Allocation',
      complexity: 'O(N)',
      summary: 'Searches the entire memory space to find the smallest hole that is adequate. Minimizes leftover unused space per hole, but produces tiny unusable fragments.'
    },
    'worst-fit': {
      title: 'Worst-Fit Allocation',
      type: 'Contiguous Allocation',
      complexity: 'O(N)',
      summary: 'Allocates the largest available hole, leaving the maximum leftover fragment which might be large enough for other incoming processes.'
    },
    'paging': {
      title: 'Paging & Address Translation',
      type: 'Non-Contiguous Memory',
      complexity: 'O(1) lookup',
      summary: 'Divides physical memory into fixed-size frames and logical memory into pages. Eliminates external fragmentation using a page table.'
    },
    'lru': {
      title: 'Least Recently Used (LRU) Page Replacement',
      type: 'Virtual Memory',
      complexity: 'O(1) with stack/counter',
      summary: 'Replaces the page in memory that has not been referenced for the longest duration of time, approximating optimal replacement.'
    },

    // Deadlock Management
    'bankers': {
      title: "Banker's Algorithm",
      type: 'Deadlock Avoidance',
      complexity: 'O(M * N^2)',
      summary: 'Tests for safety by simulating the allocation of predetermined maximum possible amounts of all resources before deciding whether allocation should be granted.'
    },
    'rag': {
      title: 'Resource Allocation Graph (RAG)',
      type: 'Deadlock Modeling',
      complexity: 'O(V + E)',
      summary: 'Directed graph representing processes as circles and resources as squares. Cycles indicate deadlock in single-unit resource systems.'
    },
    'safety-check': {
      title: 'System Safety State Analysis',
      type: 'Safety Algorithm',
      complexity: 'O(M * N^2)',
      summary: 'Determines if there exists at least one safe sequence <P1, P2, ... Pn> such that each process can satisfy its maximum demand and release all resources.'
    },
    'detection': {
      title: 'Deadlock Detection & Recovery',
      type: 'Detection Algorithm',
      complexity: 'O(M * N^2)',
      summary: 'Periodically checks for deadlocked processes and resolves them through resource preemption, process termination, or rollbacks.'
    }
  };

  if (algoTabs.length > 0) {
    algoTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        algoTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const key = tab.dataset.algo;
        const data = algorithmData[key];

        if (data && algoInfoContainer) {
          algoInfoContainer.innerHTML = `
            <div style="border-left: 3px solid var(--accent-blue); padding-left: 1rem;">
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.35rem;">
                <h4 style="color:#fff; font-size:1rem; font-weight:700;">${data.title}</h4>
                <span class="badge badge-blue">${data.type}</span>
                <span class="badge badge-amber">${data.complexity}</span>
              </div>
              <p style="color:var(--text-secondary); font-size:0.85rem; line-height:1.5;">${data.summary}</p>
            </div>
          `;
        }
      });
    });
  }

  // Notice when clicking interactive controls in placeholder mode
  const disabledButtons = document.querySelectorAll('.disabled-control-btn');
  disabledButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.showToast) {
        window.showToast('Stage 1 Active: Simulation controls and algorithm execution will be active in the next stage.', 'info');
      }
    });
  });
})();
