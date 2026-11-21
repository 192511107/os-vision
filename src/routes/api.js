const express = require('express');
const router = express.Router();

const cpuSchedulingRouter = require('./cpuScheduling');
const memoryManagementRouter = require('./memoryManagement');

/**
 * Health-check endpoint
 * Returns current system operational status, uptime, and module readiness.
 */
router.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    application: 'OS-Vision: Interactive OS Scheduling and Resource Management Simulator',
    version: '1.0.0',
    stage: 'Stage 1: Foundation',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100
    },
    modules: {
      cpuScheduling: {
        id: 'cpu-scheduling',
        title: 'CPU Process Scheduling',
        status: 'active',
        stage: 2,
        activeAlgorithms: ['FCFS', 'SJF', 'SRTF', 'Round Robin', 'Priority']
      },
      schedulingComparison: {
        id: 'scheduling-comparison',
        title: 'Scheduling Algorithm Comparison',
        status: 'active',
        module: 2,
        comparedAlgorithms: ['FCFS', 'SJF', 'SRTF', 'Priority', 'Round Robin']
      },
      schedulingAnalysis: {
        id: 'scheduling-analysis',
        title: 'Scheduling Performance Analysis',
        status: 'active',
        module: 3,
        features: ['Comparative Charts', 'Execution Statistics', 'Dynamic Insights', 'Workload Recalculation']
      },
      memoryManagement: {
        id: 'memory-management',
        title: 'Memory Management Simulator',
        status: 'hidden',
        stage: 3,
        activeAlgorithms: ['First-Fit', 'Best-Fit', 'Worst-Fit', 'FIFO', 'LRU', 'Optimal']
      },
      deadlockManagement: {
        id: 'deadlock-management',
        title: 'Deadlock Management Simulator',
        status: 'hidden',
        stage: 4,
        plannedFeatures: ['Resource Allocation Graph (RAG)', "Banker's Algorithm", 'Safety Check', 'Deadlock Detection & Recovery']
      }
    }
  };

  res.status(200).json(healthData);
});

// Mount module sub-routers
router.use('/cpu-scheduling', cpuSchedulingRouter);
router.use('/memory-management', memoryManagementRouter);

module.exports = router;
