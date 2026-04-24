const express = require('express');
const { validate, schemas } = require('../middleware/validation');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const patientController = require('../controllers/patientController');

const router = express.Router();

// Apply authentication to all routes (Everyone logged in can pass this gate)
router.use(authenticate);

// GET /api/patients - Get all patients with pagination and filtering
// ✅ FIX: Completely open for ALL authenticated roles to read
router.get('/', 
  validate(schemas.pagination, 'query'),
  validate(schemas.patientFilter, 'query'),
  asyncHandler(patientController.getPatients)
);

// GET /api/patients/stats - Get patient statistics
router.get('/stats', 
  asyncHandler(patientController.getPatientStats)
);

// GET /api/patients/orthodontists - Get active orthodontists for assignment
router.get('/orthodontists',
  authorizeRoles('RECEPTION', 'ORTHODONTIST', 'DENTAL_SURGEON', 'STUDENT', 'NURSE', 'ADMIN'),
  asyncHandler(patientController.getActiveOrthodontists)
);

// GET /api/patients/assignable-staff - Get assignable staff for patient care team
router.get('/assignable-staff',
  authorizeRoles('RECEPTION', 'ORTHODONTIST', 'ADMIN'),
  asyncHandler(patientController.getAssignableStaff)
);

// GET /api/patients/assignment-requests/pending - Pending assignment confirmations
router.get('/assignment-requests/pending',
  authorizeRoles('ORTHODONTIST', 'DENTAL_SURGEON', 'ADMIN'),
  asyncHandler(patientController.getPendingAssignmentRequests)
);

// POST /api/patients/assignment-requests/:requestId/respond - Approve/reject assignment
router.post('/assignment-requests/:requestId/respond',
  authorizeRoles('ORTHODONTIST', 'DENTAL_SURGEON', 'ADMIN'),
  asyncHandler(patientController.respondToAssignmentRequest)
);

// GET /api/patients/:id - Get single patient by ID
router.get('/:id', 
  asyncHandler(patientController.getPatientById)
);

// POST /api/patients - Create new patient
// ✅ FIX: Locked to Reception, Doctors, and Admin
router.post('/', 
  authorizeRoles('RECEPTION', 'DENTAL_SURGEON', 'ORTHODONTIST', 'ADMIN'),
  validate(schemas.createPatient),
  asyncHandler(patientController.createPatient)
);

// PUT /api/patients/:id - Update patient
router.put('/:id', 
  authorizeRoles('RECEPTION', 'DENTAL_SURGEON', 'ORTHODONTIST', 'ADMIN'),
  validate(schemas.updatePatient),
  asyncHandler(patientController.updatePatient)
);

// DELETE /api/patients/:id - Delete patient (Admin only)
router.delete('/:id', 
  authorizeRoles('ADMIN'),
  asyncHandler(patientController.deletePatient)
);

// PUT /api/patients/:id/reactivate - Reactivate inactive patient
router.put('/:id/reactivate',
  authorizeRoles('ADMIN'),
  asyncHandler(patientController.reactivatePatient)
);

// GET /api/patients/:id/assignments - Get active patient assignments
router.get('/:id/assignments',
  asyncHandler(patientController.getPatientAssignments)
);

// POST /api/patients/:id/assignments - Assign care-team member to patient
router.post('/:id/assignments',
  authorizeRoles('RECEPTION', 'ORTHODONTIST', 'ADMIN'),
  validate(schemas.assignPatientMember),
  asyncHandler(patientController.assignPatientMember)
);

module.exports = router;