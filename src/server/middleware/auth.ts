import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user: {
        userId: number;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    // Add user data to request
    req.user = {
      userId: decoded.userId
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authenticateSocket = (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    // Verify token
    const decoded = jwt.verify(token as string, JWT_SECRET) as { userId: number };
    
    // Add user data to socket
    socket.data.userId = decoded.userId;
    
    next();
  } catch (error) {
    next(new Error('Invalid or expired token'));
  }
};