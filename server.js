const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(' OS-Vision: Interactive OS Scheduling & Resource Sim');
  console.log(' Stage 1: Foundation Active');
  console.log('====================================================');
  console.log(` Server running on : http://localhost:${PORT}`);
  console.log(` Health Check API  : http://localhost:${PORT}/api/health`);
  console.log(` Environment       : ${process.env.NODE_ENV || 'development'}`);
  console.log(' Press Ctrl+C to terminate the server');
  console.log('====================================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down OS-Vision server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received. Shutting down OS-Vision server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
