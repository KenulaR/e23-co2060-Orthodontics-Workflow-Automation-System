// codes/Backend/src/controllers/queueController.js
const pool = require('../config/database');

const queueController = {
    // 1. Fetch the Queue AND the Stats
    getClinicBoard: async (req, res) => {
        try {
            const [queueItems] = await pool.query(`
                SELECT 
                    q.id AS queue_id,
                    q.status,
                    q.bay,
                    q.arrival_time,
                    p.id AS patient_id,
                    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                    s.id AS student_id,
                    s.name AS student_name
                FROM queue q
                JOIN patients p ON q.patient_id = p.id
                LEFT JOIN users s ON q.student_id = s.id
                ORDER BY 
                    FIELD(q.status, 'under treatment', 'under consultation', 'In waiting room', 'Treatments are done / Done'),
                    q.arrival_time ASC
            `);

            const stats = {
                inTreatment: queueItems.filter(item => 
                    item.status === 'under treatment' || item.status === 'under consultation'
                ).length,
                waiting: queueItems.filter(item => item.status === 'In waiting room').length,
                done: queueItems.filter(item => item.status === 'Treatments are done / Done').length,
                totalToday: queueItems.length
            };
            
            res.status(200).json({ success: true, stats, data: queueItems });
        } catch (error) {
            console.error('Error fetching clinic board:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch queue data' });
        }
    },

    // 2. Fetch all patients for dropdown
    getAvailablePatients: async (req, res) => {
        try {
            const [patients] = await pool.query(`
                SELECT * FROM patients ORDER BY first_name ASC
            `);
            res.status(200).json({ success: true, data: patients });
        } catch (error) {
            console.error('Error fetching patients:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch patients' });
        }
    },

    // 3. Register a new patient
    registerPatient: async (req, res) => {
        try {
            const { patient_id, status, student_id, bay } = req.body;

            if (!patient_id) {
                return res.status(400).json({ success: false, message: 'Patient ID is required' });
            }

            const [result] = await pool.query(
                `INSERT INTO queue (patient_id, status, student_id, bay, arrival_time) 
                 VALUES (?, ?, ?, ?, NOW())`,
                [patient_id, status || 'In waiting room', student_id || null, bay || null]
            );

            res.status(201).json({ 
                success: true, 
                message: 'Patient added to queue', 
                queue_id: result.insertId 
            });
        } catch (error) {
            console.error('Error registering patient:', error);
            res.status(500).json({ success: false, message: 'Failed to register patient to queue' });
        }
    },

    // 4. Update status
    updateQueueStatus: async (req, res) => {
        try {
            const queueId = req.params.id;
            const { status } = req.body;

            const [result] = await pool.query(
                'UPDATE queue SET status = ? WHERE id = ?',
                [status, queueId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Queue item not found' });
            }

            res.status(200).json({ 
                success: true, 
                message: `Status updated to ${status}` 
            });
        } catch (error) {
            console.error('Error updating status:', error);
            res.status(500).json({ success: false, message: 'Failed to update status' });
        }
    }
};

module.exports = queueController;