const express = require('express');
const path = require('path');
const apiRouter = require('./routes/api');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for console visibility
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Serve static assets from the public directory
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// API routes
app.use('/api', apiRouter);

// Clean navigation routes
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/cpu-scheduling', (req, res) => {
  res.sendFile(path.join(publicDir, 'pages', 'cpu-scheduling.html'));
});

app.get('/scheduling-comparison', (req, res) => {
  res.sendFile(path.join(publicDir, 'pages', 'scheduling-comparison.html'));
});

app.get('/scheduling-analysis', (req, res) => {
  res.sendFile(path.join(publicDir, 'pages', 'scheduling-analysis.html'));
});

app.get('/memory-management', (req, res) => {
  res.sendFile(path.join(publicDir, 'pages', 'memory-management.html'));
});

app.get('/deadlock-management', (req, res) => {
  res.sendFile(path.join(publicDir, 'pages', 'deadlock-management.html'));
});

// 404 Handler
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(publicDir, 'pages', '404.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

module.exports = app;
