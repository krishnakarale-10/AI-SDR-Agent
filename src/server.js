import app from "./app.js";
import prisma from "./config/prisma.js";
import "dotenv/config";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`Express API is live and listening on port ${PORT}`);
  
  // Optional: Ping the database to ensure it's connected on startup
  try {
    await prisma.$connect();
    console.log( "PostgreSQL database connected successfully.");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
  }
});

const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  // Stop accepting new HTTP requests
  server.close(async () => {
    console.log('HTTP server closed.');
    
    // Disconnect the Prisma database client safely
    await prisma.$disconnect();
    console.log('Database connection closed.');
    
    // Exit the Node process
    process.exit(0);
  });

  // Force close after 10 seconds if it's hanging
  setTimeout(() => {
    console.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT')); // Catches CTRL+C in your terminal

// Prevents the entire server from silently crashing if a rogue Promise fails somewhere.
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Do NOT crash the server here, just log it so you can fix the bug.
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception thrown:', error);
  // This means the Node instance is in an unstable state. We MUST shut down.
  shutdown('uncaughtException');
});


