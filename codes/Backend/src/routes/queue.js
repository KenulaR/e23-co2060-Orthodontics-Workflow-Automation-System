const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.use(authenticate);

router.get('/patients', queueController.getAvailablePatients);
router.get('/stats', queueController.getQueueStats);

router.get('/', queueController.getClinicBoard);
router.post(
  '/',
  authorizeRoles('RECEPTION'),
  validate(schemas.createQueue),
  queueController.registerPatient
);

router.put(
  '/:id/status',
  authorizeRoles('RECEPTION', 'DENTAL_SURGEON', 'ORTHODONTIST', 'STUDENT'),
  validate(schemas.updateQueueStatus),
  queueController.updateQueueStatus
);

router.delete(
  '/:id',
  authorizeRoles('RECEPTION'),
  queueController.removeQueueEntry
);

module.exports = router;
