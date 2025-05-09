import { io, Socket } from 'socket.io-client';
import { Printer } from '../../shared/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

interface ServerToClientEvents {
  printerUpdate: (printer: Printer) => void;
  printerConnected: (printerId: number) => void;
  printerDisconnected: (printerId: number) => void;
}

interface ClientToServerEvents {
  subscribeToPrinter: (printerId: number) => void;
  unsubscribeFromPrinter: (printerId: number) => void;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private eventHandlers: { [key: string]: ((data: any) => void)[] } = {};

  connect(): void {
    if (this.socket) return;

    this.socket = io(SOCKET_URL);

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Set up event handlers
    this.socket.on('printerUpdate', (printer) => {
      // Ensure printer properties are primitives
      if (printer && typeof printer === 'object') {
        if (printer.id) printer.id = Number(printer.id);
        if (printer.userId) printer.userId = Number(printer.userId);
        if (printer.status) {
          if (printer.status.progress) printer.status.progress = Number(printer.status.progress);
          if (printer.status.timeRemaining) printer.status.timeRemaining = Number(printer.status.timeRemaining);
          if (printer.status.temperature) {
            if (printer.status.temperature.nozzle) printer.status.temperature.nozzle = Number(printer.status.temperature.nozzle);
            if (printer.status.temperature.bed) printer.status.temperature.bed = Number(printer.status.temperature.bed);
          }
        }
      }
      this.triggerEvent('printerUpdate', printer);
    });

    this.socket.on('printerConnected', (printerId) => {
      this.triggerEvent('printerConnected', Number(printerId));
    });

    this.socket.on('printerDisconnected', (printerId) => {
      this.triggerEvent('printerDisconnected', Number(printerId));
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  subscribeToPrinter(printerId: number): void {
    if (!this.socket) this.connect();
    this.socket?.emit('subscribeToPrinter', Number(printerId));
  }

  unsubscribeFromPrinter(printerId: number): void {
    this.socket?.emit('unsubscribeFromPrinter', Number(printerId));
  }

  on<T>(event: string, callback: (data: T) => void): () => void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback as (data: any) => void);

    // Return unsubscribe function
    return () => {
      this.eventHandlers[event] = this.eventHandlers[event].filter(
        (handler) => handler !== callback
      );
    };
  }

  private triggerEvent(event: string, data: any): void {
    if (!this.eventHandlers[event]) return;
    for (const handler of this.eventHandlers[event]) {
      handler(data);
    }
  }
}

const socketService = new SocketService();
export default socketService;