// codes/Backend/src/routes/queueRoutes.js
const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

// Fetch the main dashboard data (List + Stats)
router.get('/', queueController.getClinicBoard);

// Add a new patient to the queue from the Modal
router.post('/', queueController.registerPatient);

// Update a patient's status
router.put('/:id/status', queueController.updateQueueStatus);

module.exports = router;