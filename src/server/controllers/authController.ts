import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { userModel } from '../models/user';
import { User, LoginCredentials } from '../../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export const authController = {
  register: async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body as LoginCredentials & { email: string };
      
      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      // Check if username already exists
      const existingUser = userModel.findByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already taken' });
      }
      
      // Create user
      const user = await userModel.create({ username, email, password });
      
      // Ensure userId is a primitive value before JWT signing
      const userId = Number(user.id);
      
      // Generate JWT token
      const token = jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // Return user (without password) and token
      return res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  login: async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body as LoginCredentials;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      // Find user
      const user = userModel.findByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Validate password
      const isPasswordValid = await userModel.validatePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Ensure userId is a primitive value before JWT signing
      const userId = Number(user.id);
      
      // Generate JWT token
      const token = jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // Return user (without password) and token
      return res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  getProfile: (req: Request, res: Response) => {
    try {
      // User is already authenticated by middleware
      const userId = req.user.userId;
      
      // Find user
      const user = userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user without password
      return res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
};