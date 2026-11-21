/**
 * OS-Vision: Interactive OS Simulator
 * Global Application Logic: Navigation, Sidebar, Live Server Health Polling & Clock
 */

(function () {
  'use strict';

  // Elements
  const sidebar = document.getElementById('sidebar');
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const serverStatusDot = document.getElementById('serverStatusDot');
  const serverStatusText = document.getElementById('serverStatusText');
  const serverUptimeText = document.getElementById('serverUptimeText');
  const systemClock = document.getElementById('systemClock');
  const healthCheckBtn = document.getElementById('healthCheckBtn');
  const liveHealthModal = document.getElementById('liveHealthModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const healthJsonDisplay = document.getElementById('healthJsonDisplay');

  // --- Sidebar Toggle for Mobile ---
  if (menuToggleBtn && sidebar) {
    menuToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !menuToggleBtn.contains(e.target)
      ) {
        sidebar.classList.remove('open');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    });
  }

  // --- Live Digital Clock ---
  function updateClock() {
    if (!systemClock) return;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    systemClock.textContent = timeString;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // --- Health Check Polling ---
  let lastHealthData = null;

  async function checkServerHealth() {
    const startTime = performance.now();
    try {
      const response = await fetch('/api/health');
      const latency = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        lastHealthData = { ...data, latencyMs: latency };

        if (serverStatusDot) {
          serverStatusDot.classList.remove('error');
        }
        if (serverStatusText) {
          serverStatusText.textContent = `Online (${latency}ms)`;
        }
        if (serverUptimeText) {
          serverUptimeText.textContent = `${data.uptimeSeconds}s uptime`;
        }

        // Update diagnostic view if present
        const diagOutput = document.getElementById('diagnosticOutput');
        if (diagOutput) {
          diagOutput.textContent = JSON.stringify(lastHealthData, null, 2);
        }

        // Update modal JSON if open
        if (healthJsonDisplay && liveHealthModal && liveHealthModal.classList.contains('active')) {
          healthJsonDisplay.textContent = JSON.stringify(lastHealthData, null, 2);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn('[OS-Vision] Health-check fetch failed:', err);
      if (serverStatusDot) {
        serverStatusDot.classList.add('error');
      }
      if (serverStatusText) {
        serverStatusText.textContent = 'Server Offline';
      }
      if (serverUptimeText) {
        serverUptimeText.textContent = 'Disconnected';
      }
    }
  }

  // Initial check and periodic polling
  checkServerHealth();
  setInterval(checkServerHealth, 10000);

  // --- Health Modal Trigger ---
  if (healthCheckBtn && liveHealthModal) {
    healthCheckBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      liveHealthModal.classList.add('active');
      if (healthJsonDisplay) {
        healthJsonDisplay.textContent = 'Querying /api/health...';
      }
      await checkServerHealth();
    });
  }

  if (modalCloseBtn && liveHealthModal) {
    modalCloseBtn.addEventListener('click', () => {
      liveHealthModal.classList.remove('active');
    });

    liveHealthModal.addEventListener('click', (e) => {
      if (e.target === liveHealthModal) {
        liveHealthModal.classList.remove('active');
      }
    });
  }

  // Toast Notification Utility
  window.showToast = function (message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.position = 'fixed';
      container.style.bottom = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.background = '#131d33';
    toast.style.border = '1px solid #2d4373';
    toast.style.borderRadius = '8px';
    toast.style.padding = '12px 18px';
    toast.style.color = '#f8fafc';
    toast.style.fontSize = '0.85rem';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.transition = 'all 0.2s ease';

    const icon = document.createElement('span');
    icon.innerHTML = type === 'success' ? '&#10004;' : '&#9432;';
    icon.style.color = type === 'success' ? '#10b981' : '#3b82f6';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  };
})();
