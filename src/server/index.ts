import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import db from './db/database';
import printerRoutes from './routes/printers';
import { setupMqttClient } from './services/mqtt';
import { setupStreamManager } from './services/streamManager';

// Load environment variables
dotenv.config();

// Initialize the database
db.init();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Setup Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/printers', printerRoutes);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  
  // Handle subscription to printer status
  socket.on('subscribeToPrinter', (printerId) => {
    socket.join(`printer:${printerId}`);
    console.log(`Socket ${socket.id} subscribed to printer ${printerId}`);
  });
  
  // Handle unsubscription from printer status
  socket.on('unsubscribeFromPrinter', (printerId) => {
    socket.leave(`printer:${printerId}`);
    console.log(`Socket ${socket.id} unsubscribed from printer ${printerId}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Initialize services
setupMqttClient(io);
setupStreamManager();

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  httpServer.close(() => {
    console.log('Server shut down.');
    process.exit(0);
  });
});

export { io };