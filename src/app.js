import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import  authRoutes from "./modules/auth/auth.routes.js"
import 'dotenv/config';

// You will import your route files here once we build them
// example import authRoutes from './modules/auth/auth.routes.js';
// import campaignRoutes from './modules/campaigns/campaigns.routes.js'

const app = express();

// Helmet sets 14+ secure HTTP headers automatically to block common web attacks
app.use(helmet())

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // Crucial: Allows the frontend to send cookies (for JWTs)
}));

// Morgan logs every incoming HTTP request to the terminal (e.g., "GET /api/users 200 OK")
app.use(morgan('dev'));

//Express.json() parses incoming JSON payloads from the frontend into req.body
app.use(express.json());

// CookieParser allows Express to read the HttpOnly cookies where we store Refresh Tokens
app.use(cookieParser());

// Health check endpoint (Hosting providers ping this to make sure your server isn't frozen)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SDR Engine is running.' });
});

// We will mount your actual feature routes here later
   app.use('/api/auth', authRoutes);
// app.use('/api/campaigns', campaignRoutes);

// If a user tries to hit a URL that doesn't exist (e.g., /api/banana)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});


app.use((err, req, res, next) => {
  console.error('Error caught by global handler:', err.message);

  // If the error doesn't have a specific status code, default to 500 (Internal Server Error)
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only send the complex error stack trace if we are in development mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;