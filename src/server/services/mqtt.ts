import mqtt from 'mqtt';
import { Server as SocketIOServer } from 'socket.io';
import { Printer, PrintStatus, PrinterStatus } from '../../shared/types';
import { printerModel } from '../models/printer';

// Simplified BambuLab MQTT protocol handlers
class MqttService {
  private clients: Map<number, mqtt.MqttClient> = new Map();
  private io: SocketIOServer | null = null;
  
  init(io: SocketIOServer) {
    this.io = io;
    
    // Initialize connections to all printers
    this.initializeAllConnections();
  }
  
  private async initializeAllConnections() {
    // In a real implementation, this would query all printers and connect to them
    // For this MVP, we'll handle connections as printers are requested
  }
  
  connectToPrinter(printer: Printer) {
    if (!printer || !printer.id || this.clients.has(printer.id)) {
      return;
    }
    
    // BambuLab printers use MQTT over TLS
    // Format: mqtts://bblp:[access_code]@[ip_address]:8883
    const mqttUrl = `mqtt://${printer.ipAddress}:8883`;
    
    // Connect options
    const options = {
      username: 'bblp',
      password: printer.accessCode,
      clientId: `bambu-monitor-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
    };
    
    try {
      // Connect to printer
      const client = mqtt.connect(mqttUrl, options);
      
      // Store client
      this.clients.set(printer.id, client);
      
      // Handle connection events
      client.on('connect', () => {
        console.log(`Connected to printer ${printer.id} (${printer.name})`);
        
        // Subscribe to printer status topic
        client.subscribe(`device/${printer.serialNumber}/report`);
        
        // Update printer connection status
        printerModel.setConnected(printer.id, true);
        
        // Notify clients
        this.notifyPrinterConnected(printer.id);
      });
      
      client.on('message', (topic, message) => {
        this.handlePrinterMessage(printer.id, topic, message.toString());
      });
      
      client.on('error', (error) => {
        console.error(`MQTT error for printer ${printer.id}:`, error);
      });
      
      client.on('close', () => {
        console.log(`Disconnected from printer ${printer.id}`);
        
        // Update printer connection status
        printerModel.setConnected(printer.id, false);
        
        // Notify clients
        this.notifyPrinterDisconnected(printer.id);
      });
    } catch (error) {
      console.error(`Failed to connect to printer ${printer.id}:`, error);
    }
  }
  
  disconnectFromPrinter(printerId: number) {
    const client = this.clients.get(printerId);
    
    if (client) {
      client.end(true);
      this.clients.delete(printerId);
      
      // Update printer connection status
      printerModel.setConnected(printerId, false);
      
      // Notify clients
      this.notifyPrinterDisconnected(printerId);
    }
  }
  
  stopPrint(printer: Printer): boolean {
    if (!printer || !printer.id || !printer.serialNumber) {
      return false;
    }
    
    const client = this.clients.get(printer.id);
    
    if (!client || !client.connected) {
      return false;
    }
    
    try {
      // Send stop command to printer
      // In a real implementation, this would use the actual BambuLab MQTT protocol
      const stopCommand = JSON.stringify({
        command: "stop_print"
      });
      
      client.publish(`device/${printer.serialNumber}/command`, stopCommand);
      return true;
    } catch (error) {
      console.error(`Failed to stop print for printer ${printer.id}:`, error);
      return false;
    }
  }
  
  private handlePrinterMessage(printerId: number, topic: string, message: string) {
    if (!printerId || !topic || !message) {
      console.error('Missing required parameters in handlePrinterMessage');
      return;
    }
    
    try {
      // Parse message (in a real implementation, this would handle the BambuLab MQTT protocol)
      const data = JSON.parse(message);
      
      // Update printer status
      if (data && typeof data === 'object' && data.print) {
        const status: Partial<PrinterStatus> = {};
        
        // Map status
        if (data.print.status !== undefined && typeof data.print.status === 'string') {
          const statusText = data.print.status.toLowerCase();
          switch (statusText) {
            case 'running':
              status.status = PrintStatus.PRINTING;
              break;
            case 'paused':
              status.status = PrintStatus.PAUSED;
              break;
            case 'finished':
              status.status = PrintStatus.COMPLETED;
              break;
            case 'idle':
              status.status = PrintStatus.IDLE;
              break;
            case 'error':
              status.status = PrintStatus.ERROR;
              break;
            default:
              status.status = PrintStatus.IDLE;
          }
        }
        
        // Map progress
        if (data.print.progress !== undefined && typeof data.print.progress === 'number') {
          status.progress = data.print.progress;
        }
        
        // Map time remaining
        if (data.print.time_remaining !== undefined && typeof data.print.time_remaining === 'number') {
          status.timeRemaining = data.print.time_remaining;
        }
        
        // Map current file
        if (data.print.gcode_file && typeof data.print.gcode_file === 'string') {
          status.currentFile = data.print.gcode_file;
        }
        
        // Map temperatures
        if (data.temperature && typeof data.temperature === 'object') {
          status.temperature = {
            nozzle: typeof data.temperature.nozzle === 'number' ? data.temperature.nozzle : 0,
            bed: typeof data.temperature.bed === 'number' ? data.temperature.bed : 0,
          };
        }
        
        // Map error message
        if (data.print.error && typeof data.print.error === 'string') {
          status.error = data.print.error;
        }
        
        // Update status in database
        printerModel.updateStatus(printerId, status);
        
        // Notify clients
        this.notifyPrinterStatusUpdate(printerId);
      }
    } catch (error) {
      console.error(`Failed to parse message from printer ${printerId}:`, error);
    }
  }
  
  private notifyPrinterStatusUpdate(printerId: number) {
    if (!this.io) return;
    
    // Get updated printer data
    const printer = printerModel.findById(printerId, -1);
    
    if (printer) {
      // Emit to printer-specific room
      this.io.to(`printer:${printerId}`).emit('printerUpdate', printer);
    }
  }
  
  private notifyPrinterConnected(printerId: number) {
    if (!this.io) return;
    
    // Emit to printer-specific room
    this.io.to(`printer:${printerId}`).emit('printerConnected', printerId);
    
    // Update status
    this.notifyPrinterStatusUpdate(printerId);
  }
  
  private notifyPrinterDisconnected(printerId: number) {
    if (!this.io) return;
    
    // Emit to printer-specific room
    this.io.to(`printer:${printerId}`).emit('printerDisconnected', printerId);
  }
}

export const mqttService = new MqttService();

export const setupMqttClient = (io: SocketIOServer) => {
  mqttService.init(io);
};