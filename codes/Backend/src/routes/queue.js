const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const queueController = require('../controllers/queueController');
const { requirePermission, OBJECT_TYPES, PERMISSIONS } = require('../middleware/accessControl');
const { query } = require('../config/database');

// ⚠️ IMPORTANT: Specific routes like '/patients' MUST go BEFORE dynamic routes like '/:id'
router.get('/patients', queueController.getAvailablePatients); 

// Standard routes
router.get('/', queueController.getClinicBoard);
router.post('/', queueController.registerPatient);

// Dynamic routes (these catch anything with an ID, so they must go last)
router.put('/:id/status', authenticate, queueController.updateQueueStatus);

// GET /api/queue - Get current queue
router.get('/', 
  requirePermission(OBJECT_TYPES.PATIENT_APPOINTMENTS, PERMISSIONS.READ),
  asyncHandler(queueController.getQueue)
);

// GET /api/queue/stats - Get queue statistics
router.get('/stats', 
  requirePermission(OBJECT_TYPES.PATIENT_APPOINTMENTS, PERMISSIONS.READ),
  asyncHandler(queueController.getQueueStats)
);

// POST /api/queue - Add patient to queue
router.post('/', 
  requirePermission(OBJECT_TYPES.PATIENT_APPOINTMENTS, PERMISSIONS.CREATE),
  validate(schemas.createQueue),
  asyncHandler(queueController.addToQueue)
);

// PUT /api/queue/:id/status - Update queue status
router.put('/:id/status', 
  requirePermission(OBJECT_TYPES.PATIENT_APPOINTMENTS, PERMISSIONS.UPDATE, { resolvePatientId: resolvePatientIdFromQueueId }),
  validate(schemas.updateQueueStatus),
  asyncHandler(queueController.updateQueueStatus)
);

// DELETE /api/queue/:id - Remove from queue
router.delete('/:id', 
  requirePermission(OBJECT_TYPES.PATIENT_APPOINTMENTS, PERMISSIONS.DELETE, { resolvePatientId: resolvePatientIdFromQueueId }),
  asyncHandler(queueController.removeFromQueue)
);

module.exports = router;
