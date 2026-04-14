// codes/Backend/src/routes/queueRoutes.js
const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

// ⚠️ IMPORTANT: Specific routes like '/patients' MUST go BEFORE dynamic routes like '/:id'
router.get('/patients', queueController.getAvailablePatients); 

// Standard routes
router.get('/', queueController.getClinicBoard);
router.post('/', queueController.registerPatient);

// Dynamic routes (these catch anything with an ID, so they must go last)
router.put('/:id/status', queueController.updateQueueStatus);

module.exports = router;