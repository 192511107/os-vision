const express = require('express');
const router = express.Router();
const {
  allocateMemory,
  simulatePageReplacement,
  getMemorySampleScenarios,
  validateAllocationInput,
  validatePageReplacementInput
} = require('../services/memoryManager');

/**
 * POST /api/memory-management/allocate
 * Simulates contiguous partition allocation (First-Fit, Best-Fit, Worst-Fit).
 */
router.post('/allocate', (req, res) => {
  try {
    const validation = validateAllocationInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const result = allocateMemory(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('[Memory Allocation Error]:', err.message);
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to simulate memory allocation.'
    });
  }
});

/**
 * POST /api/memory-management/page-replacement
 * Simulates page replacement policies (FIFO, LRU, Optimal).
 */
router.post('/page-replacement', (req, res) => {
  try {
    const validation = validatePageReplacementInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const result = simulatePageReplacement(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('[Page Replacement Error]:', err.message);
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to simulate page replacement.'
    });
  }
});

/**
 * GET /api/memory-management/samples
 * Returns pre-configured sample datasets for memory allocation and page replacement.
 */
router.get('/samples', (req, res) => {
  try {
    const samples = getMemorySampleScenarios();
    res.status(200).json({
      success: true,
      samples
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve sample memory scenarios.'
    });
  }
});

module.exports = router;
