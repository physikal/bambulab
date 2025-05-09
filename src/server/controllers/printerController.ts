import { Request, Response } from 'express';
import { printerModel } from '../models/printer';
import { PrinterConfig } from '../../shared/types';
import { io } from '../index';
import { mqttService } from '../services/mqtt';

// Mock user ID for all operations since we removed authentication
const DEFAULT_USER_ID = 1;

export const printerController = {
  getAll: (req: Request, res: Response) => {
    try {
      const printers = printerModel.findByUserId(DEFAULT_USER_ID);
      
      return res.status(200).json(printers);
    } catch (error) {
      console.error('Get all printers error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  getById: (req: Request, res: Response) => {
    try {
      const printerId = parseInt(req.params.id);
      
      if (isNaN(printerId)) {
        return res.status(400).json({ message: 'Invalid printer ID' });
      }
      
      const printer = printerModel.findById(printerId, DEFAULT_USER_ID);
      
      if (!printer) {
        return res.status(404).json({ message: 'Printer not found' });
      }
      
      return res.status(200).json(printer);
    } catch (error) {
      console.error('Get printer by ID error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  create: (req: Request, res: Response) => {
    try {
      const printerData = req.body as Omit<PrinterConfig, 'userId'>;
      
      // Validate input
      if (!printerData.name || !printerData.ipAddress || !printerData.accessCode) {
        return res.status(400).json({ message: 'Name, IP address, and access code are required' });
      }
      
      // Create printer with default user ID
      const printer = printerModel.create({
        ...printerData,
        userId: DEFAULT_USER_ID
      });
      
      // Connect to printer via MQTT
      mqttService.connectToPrinter(printer);
      
      return res.status(201).json(printer);
    } catch (error) {
      console.error('Create printer error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  update: (req: Request, res: Response) => {
    try {
      const printerId = parseInt(req.params.id);
      const printerData = req.body as Partial<Omit<PrinterConfig, 'userId'>>;
      
      if (isNaN(printerId)) {
        return res.status(400).json({ message: 'Invalid printer ID' });
      }
      
      const updatedPrinter = printerModel.update(printerId, DEFAULT_USER_ID, printerData);
      
      if (!updatedPrinter) {
        return res.status(404).json({ message: 'Printer not found' });
      }
      
      // Reconnect to printer if IP or access code was updated
      if (printerData.ipAddress || printerData.accessCode) {
        mqttService.disconnectFromPrinter(printerId);
        mqttService.connectToPrinter(updatedPrinter);
      }
      
      return res.status(200).json(updatedPrinter);
    } catch (error) {
      console.error('Update printer error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  delete: (req: Request, res: Response) => {
    try {
      const printerId = parseInt(req.params.id);
      
      if (isNaN(printerId)) {
        return res.status(400).json({ message: 'Invalid printer ID' });
      }
      
      // Disconnect from printer
      mqttService.disconnectFromPrinter(printerId);
      
      const success = printerModel.delete(printerId, DEFAULT_USER_ID);
      
      if (!success) {
        return res.status(404).json({ message: 'Printer not found' });
      }
      
      return res.status(200).json({ message: 'Printer deleted successfully' });
    } catch (error) {
      console.error('Delete printer error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  stopPrint: (req: Request, res: Response) => {
    try {
      const printerId = parseInt(req.params.id);
      
      if (isNaN(printerId)) {
        return res.status(400).json({ message: 'Invalid printer ID' });
      }
      
      const printer = printerModel.findById(printerId, DEFAULT_USER_ID);
      
      if (!printer) {
        return res.status(404).json({ message: 'Printer not found' });
      }
      
      // Send stop command via MQTT
      const success = mqttService.stopPrint(printer);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to stop print' });
      }
      
      return res.status(200).json({ message: 'Print stopped successfully' });
    } catch (error) {
      console.error('Stop print error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
  
  getStreamUrl: (req: Request, res: Response) => {
    try {
      const printerId = parseInt(req.params.id);
      
      if (isNaN(printerId)) {
        return res.status(400).json({ message: 'Invalid printer ID' });
      }
      
      const printer = printerModel.findById(printerId, DEFAULT_USER_ID);
      
      if (!printer) {
        return res.status(404).json({ message: 'Printer not found' });
      }
      
      // In a real implementation, this would return a WebRTC or proxied stream URL
      const streamUrl = `/api/printers/${printerId}/stream/hls/index.m3u8`;
      
      return res.status(200).json({ streamUrl });
    } catch (error) {
      console.error('Get stream URL error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
};