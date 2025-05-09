import database from '../db/database';
import { Printer, PrinterConfig, PrinterStatus, PrintStatus } from '../../shared/types';

export const printerModel = {
  create: (printerData: PrinterConfig): Printer => {
    const db = database.get();
    
    // Insert printer
    const stmt = db.prepare(`
      INSERT INTO printers (name, ip_address, serial_number, access_code, user_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      printerData.name,
      printerData.ipAddress,
      printerData.serialNumber || '',
      printerData.accessCode,
      Number(printerData.userId) // Ensure userId is a number
    );
    
    // Ensure lastInsertRowid is converted to a number primitive
    const printerId = typeof result.lastInsertRowid === 'object'
      ? Number(result.lastInsertRowid.toString())
      : Number(result.lastInsertRowid);
    
    // Create initial status entry
    const statusStmt = db.prepare(`
      INSERT INTO printer_status (printer_id, status)
      VALUES (?, ?)
    `);
    
    statusStmt.run(printerId, PrintStatus.IDLE);
    
    return printerModel.findById(printerId, Number(printerData.userId))!;
  },
  
  findById: (id: number, userId: number): Printer | null => {
    const db = database.get();
    
    // Ensure id and userId are numbers
    const printerId = Number(id);
    const userIdNum = Number(userId);
    
    const stmt = db.prepare(`
      SELECT 
        p.id, 
        p.name, 
        p.ip_address as ipAddress, 
        p.serial_number as serialNumber, 
        p.access_code as accessCode, 
        p.user_id as userId,
        s.status as statusValue, 
        s.progress, 
        s.time_remaining as timeRemaining, 
        s.current_file as currentFile,
        s.nozzle_temp as nozzleTemp,
        s.bed_temp as bedTemp,
        s.error_message as errorMessage,
        s.connected,
        s.last_seen as lastSeen
      FROM printers p
      LEFT JOIN printer_status s ON p.id = s.printer_id
      WHERE p.id = ? AND p.user_id = ?
    `);
    
    const result = stmt.get(printerId, userIdNum) as any | null;
    
    if (!result) return null;
    
    return {
      id: Number(result.id),
      name: result.name,
      ipAddress: result.ipAddress,
      serialNumber: result.serialNumber,
      accessCode: result.accessCode,
      userId: Number(result.userId),
      status: {
        status: result.statusValue || PrintStatus.IDLE,
        progress: Number(result.progress || 0),
        timeRemaining: Number(result.timeRemaining || 0),
        currentFile: result.currentFile,
        temperature: result.nozzleTemp ? {
          nozzle: Number(result.nozzleTemp),
          bed: Number(result.bedTemp || 0)
        } : undefined,
        error: result.errorMessage
      },
      connected: Boolean(result.connected),
      lastSeen: result.lastSeen
    };
  },
  
  findByUserId: (userId: number): Printer[] => {
    const db = database.get();
    const userIdNum = Number(userId);
    
    const stmt = db.prepare(`
      SELECT 
        p.id, 
        p.name, 
        p.ip_address as ipAddress, 
        p.serial_number as serialNumber, 
        p.access_code as accessCode, 
        p.user_id as userId,
        s.status as statusValue, 
        s.progress, 
        s.time_remaining as timeRemaining, 
        s.current_file as currentFile,
        s.nozzle_temp as nozzleTemp,
        s.bed_temp as bedTemp,
        s.error_message as errorMessage,
        s.connected,
        s.last_seen as lastSeen
      FROM printers p
      LEFT JOIN printer_status s ON p.id = s.printer_id
      WHERE p.user_id = ?
    `);
    
    const results = stmt.all(userIdNum) as any[];
    
    return results.map(result => ({
      id: Number(result.id),
      name: result.name,
      ipAddress: result.ipAddress,
      serialNumber: result.serialNumber,
      accessCode: result.accessCode,
      userId: Number(result.userId),
      status: {
        status: result.statusValue || PrintStatus.IDLE,
        progress: Number(result.progress || 0),
        timeRemaining: Number(result.timeRemaining || 0),
        currentFile: result.currentFile,
        temperature: result.nozzleTemp ? {
          nozzle: Number(result.nozzleTemp),
          bed: Number(result.bedTemp || 0)
        } : undefined,
        error: result.errorMessage
      },
      connected: Boolean(result.connected),
      lastSeen: result.lastSeen
    }));
  },
  
  update: (id: number, userId: number, data: Partial<PrinterConfig>): Printer | null => {
    const db = database.get();
    
    const printerId = Number(id);
    const userIdNum = Number(userId);
    
    const printer = printerModel.findById(printerId, userIdNum);
    if (!printer) return null;
    
    const stmt = db.prepare(`
      UPDATE printers
      SET name = ?, ip_address = ?, serial_number = ?, access_code = ?
      WHERE id = ? AND user_id = ?
    `);
    
    stmt.run(
      data.name || printer.name,
      data.ipAddress || printer.ipAddress,
      data.serialNumber || printer.serialNumber,
      data.accessCode || printer.accessCode,
      printerId,
      userIdNum
    );
    
    return printerModel.findById(printerId, userIdNum);
  },
  
  delete: (id: number, userId: number): boolean => {
    const db = database.get();
    const printerId = Number(id);
    const userIdNum = Number(userId);
    
    const stmt = db.prepare('DELETE FROM printers WHERE id = ? AND user_id = ?');
    const result = stmt.run(printerId, userIdNum);
    return result.changes > 0;
  },
  
  updateStatus: (id: number, status: Partial<PrinterStatus>): boolean => {
    const db = database.get();
    const printerId = Number(id);
    
    // Get current status
    const getStmt = db.prepare('SELECT * FROM printer_status WHERE printer_id = ?');
    const currentStatus = getStmt.get(printerId);
    
    if (!currentStatus) {
      // Create initial status if it doesn't exist
      const insertStmt = db.prepare(`
        INSERT INTO printer_status (
          printer_id, status, progress, time_remaining, 
          current_file, nozzle_temp, bed_temp, error_message, connected
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(
        printerId,
        status.status || PrintStatus.IDLE,
        Number(status.progress || 0),
        Number(status.timeRemaining || 0),
        status.currentFile || null,
        status.temperature?.nozzle ? Number(status.temperature.nozzle) : null,
        status.temperature?.bed ? Number(status.temperature.bed) : null,
        status.error || null,
        1
      );
      
      return true;
    } else {
      // Update existing status
      const updateStmt = db.prepare(`
        UPDATE printer_status
        SET status = ?, 
            progress = ?, 
            time_remaining = ?, 
            current_file = ?, 
            nozzle_temp = ?, 
            bed_temp = ?, 
            error_message = ?, 
            connected = ?,
            last_seen = CURRENT_TIMESTAMP
        WHERE printer_id = ?
      `);
      
      updateStmt.run(
        status.status !== undefined ? status.status : currentStatus.status,
        status.progress !== undefined ? Number(status.progress) : Number(currentStatus.progress),
        status.timeRemaining !== undefined ? Number(status.timeRemaining) : Number(currentStatus.time_remaining),
        status.currentFile !== undefined ? status.currentFile : currentStatus.current_file,
        status.temperature?.nozzle !== undefined ? Number(status.temperature.nozzle) : currentStatus.nozzle_temp,
        status.temperature?.bed !== undefined ? Number(status.temperature.bed) : currentStatus.bed_temp,
        status.error !== undefined ? status.error : currentStatus.error_message,
        1,
        printerId
      );
      
      return true;
    }
  },
  
  setConnected: (id: number, connected: boolean): boolean => {
    const db = database.get();
    const printerId = Number(id);
    
    // Check if status record exists
    const checkStmt = db.prepare('SELECT 1 FROM printer_status WHERE printer_id = ?');
    const exists = checkStmt.get(printerId);
    
    if (!exists) {
      // Create initial status record
      const insertStmt = db.prepare(`
        INSERT INTO printer_status (printer_id, status, connected)
        VALUES (?, ?, ?)
      `);
      insertStmt.run(printerId, PrintStatus.IDLE, connected ? 1 : 0);
    } else {
      // Update existing record
      const updateStmt = db.prepare(`
        UPDATE printer_status
        SET connected = ?, 
            last_seen = CURRENT_TIMESTAMP
        WHERE printer_id = ?
      `);
      updateStmt.run(connected ? 1 : 0, printerId);
    }
    
    return true;
  }
};