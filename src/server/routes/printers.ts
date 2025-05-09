import express from 'express';
import { printerController } from '../controllers/printerController';

const router = express.Router();

// Get all printers
router.get('/', printerController.getAll);

// Get printer by ID
router.get('/:id', printerController.getById);

// Create new printer
router.post('/', printerController.create);

// Update printer
router.put('/:id', printerController.update);

// Delete printer
router.delete('/:id', printerController.delete);

// Stop print
router.post('/:id/stop', printerController.stopPrint);

// Get stream URL
router.get('/:id/stream', printerController.getStreamUrl);

export default router;