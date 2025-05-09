import axios from 'axios';
import { Printer, PrinterConfig } from '../../shared/types';

// Use absolute URL to ensure consistent connection
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with better timeout and error handling
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Set a reasonable timeout
});

// Add response interceptor to normalize IDs to numbers
api.interceptors.response.use(response => {
  // Check if response data is an object
  if (response.data && typeof response.data === 'object') {
    // If it's an array
    if (Array.isArray(response.data)) {
      response.data = response.data.map(item => normalizeIds(item));
    } 
    // If it's a single object
    else {
      response.data = normalizeIds(response.data);
    }
  }
  return response;
}, (error) => {
  // Improve error handling with more specific error messages
  if (error.code === 'ECONNABORTED') {
    console.error('API timeout error');
    return Promise.reject(new Error('Connection timed out. Please try again.'));
  }
  
  if (error.message === 'Network Error') {
    console.error('API network error - server might be down or unreachable');
    return Promise.reject(new Error('Cannot connect to server. Please ensure the server is running and try again.'));
  }
  
  return Promise.reject(error);
});

// Helper function to normalize IDs to numbers
function normalizeIds(obj: any) {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Handle id property
  if (obj.id !== undefined) {
    obj.id = Number(obj.id);
  }
  
  // Handle userId property
  if (obj.userId !== undefined) {
    obj.userId = Number(obj.userId);
  }
  
  // Recursively process nested objects
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'object') {
      obj[key] = normalizeIds(obj[key]);
    }
  });
  
  return obj;
}

// Printers API
export const printersApi = {
  getAll: async (): Promise<Printer[]> => {
    const response = await api.get<Printer[]>('/printers');
    return response.data;
  },
  getById: async (id: number): Promise<Printer> => {
    const response = await api.get<Printer>(`/printers/${id}`);
    return response.data;
  },
  create: async (printer: PrinterConfig): Promise<Printer> => {
    const response = await api.post<Printer>('/printers', printer);
    return response.data;
  },
  update: async (id: number, printer: Partial<PrinterConfig>): Promise<Printer> => {
    const response = await api.put<Printer>(`/printers/${id}`, printer);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/printers/${id}`);
  },
  stopPrint: async (id: number): Promise<void> => {
    await api.post(`/printers/${id}/stop`);
  },
};

export default api;