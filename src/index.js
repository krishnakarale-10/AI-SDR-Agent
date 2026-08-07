// src/index.js

console.log('🚀 Initializing AI SDR Backend...');

// 1. Boot up the Express HTTP Server
import './server.js';

// 2. Boot up the BullMQ Background Workers
// import './worker.js'; 

console.log('✅ Dual-Boot Complete: API is running.');
// console.log('✅ Dual-Boot Complete: API and Workers are running.');