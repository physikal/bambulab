import database from '../db/database';
import bcrypt from 'bcrypt';
import { User } from '../../shared/types';

const SALT_ROUNDS = 10;

export const userModel = {
  create: async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const db = database.get();
    const hashedPassword = await bcrypt.hash(user.password!, SALT_ROUNDS);
    
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(user.username, user.email, hashedPassword);
    
    // Ensure lastInsertRowid is converted to a number primitive
    const userId = typeof result.lastInsertRowid === 'object' 
      ? Number(result.lastInsertRowid.toString()) 
      : Number(result.lastInsertRowid);
    
    const newUser: User = {
      id: userId,
      username: user.username,
      email: user.email,
    };
    
    return newUser;
  },
  
  findById: (id: number): User | null => {
    const db = database.get();
    const stmt = db.prepare('SELECT id, username, email, created_at as createdAt FROM users WHERE id = ?');
    const user = stmt.get(id) as User | null;
    return user;
  },
  
  findByUsername: (username: string): (User & { password: string }) | null => {
    const db = database.get();
    const stmt = db.prepare('SELECT id, username, email, password, created_at as createdAt FROM users WHERE username = ?');
    const user = stmt.get(username) as (User & { password: string }) | null;
    return user;
  },
  
  validatePassword: async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
    return bcrypt.compare(plainPassword, hashedPassword);
  },
  
  update: (id: number, userData: Partial<User>): User | null => {
    const db = database.get();
    const user = userModel.findById(id);
    
    if (!user) return null;
    
    const { username, email } = userData;
    
    const stmt = db.prepare(`
      UPDATE users
      SET username = ?, email = ?
      WHERE id = ?
    `);
    
    stmt.run(
      username || user.username,
      email || user.email,
      id
    );
    
    return userModel.findById(id);
  },
  
  delete: (id: number): boolean => {
    const db = database.get();
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};