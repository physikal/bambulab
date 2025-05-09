export interface PrinterConfig {
  id?: number;
  name: string;
  ipAddress: string;
  serialNumber: string;
  accessCode: string;
  userId?: number; // Made optional
}

export enum PrintStatus {
  IDLE = 'idle',
  PRINTING = 'printing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface PrinterStatus {
  status: PrintStatus;
  progress: number;
  timeRemaining: number; // in seconds
  currentFile?: string;
  temperature?: {
    nozzle: number;
    bed: number;
  };
  error?: string;
}

export interface Printer extends PrinterConfig {
  status: PrinterStatus;
  connected: boolean;
  lastSeen?: string;
}