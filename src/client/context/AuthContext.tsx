import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { User, LoginCredentials } from '../../shared/types';

interface AuthContextType {
  user: Omit<User, 'password'> | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: LoginCredentials & { email: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if the user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await authApi.getProfile();
      
      // Ensure id is a number
      if (userData && userData.id) {
        userData.id = Number(userData.id);
      }
      
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError('Session expired. Please login again.');
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);
      const { token, user } = await authApi.login(credentials);
      
      // Ensure id is a number
      if (user && user.id) {
        user.id = Number(user.id);
      }
      
      localStorage.setItem('token', token);
      setUser(user);
    } catch (err: any) {
      console.error('Login failed:', err);
      const errorMessage = err.message || 'Login failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: LoginCredentials & { email: string }) => {
    try {
      setLoading(true);
      setError(null);
      const { token, user } = await authApi.register(data);
      
      // Ensure id is a number
      if (user && user.id) {
        user.id = Number(user.id);
      }
      
      localStorage.setItem('token', token);
      setUser(user);
    } catch (err: any) {
      console.error('Registration failed:', err);
      // Get a more user-friendly error message
      const errorMessage = err.message || err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};