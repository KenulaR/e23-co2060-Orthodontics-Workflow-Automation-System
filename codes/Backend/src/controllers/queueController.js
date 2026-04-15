// codes/Backend/src/controllers/queueController.js
const pool = require('../config/database');

// Bulletproof helper: extracts arrays no matter how the custom database wraps them
const extractRows = (result) => {
    if (!result) return [];
    if (Array.isArray(result)) {
        if (result.length > 0 && Array.isArray(result)) return result;
        return result;
    }
    if (typeof result === 'object') {
        if (Array.isArray(result.rows)) return result.rows;
        if (Array.isArray(result.data)) return result.data;
    }
    return [];
};

const queueController = {
    getClinicBoard: async (req, res) => {
        try {
            // THE 24-HOUR RESET: Added WHERE DATE(q.arrival_time) = CURDATE()
            const rawResult = await pool.query(`
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
                WHERE DATE(q.arrival_time) = CURDATE() 
                ORDER BY 
                    FIELD(q.status, 'under treatment', 'under consultation', 'In waiting room', 'Treatments are done / Done'),
                    q.arrival_time ASC
            `);

            // Forcefully extract the array
            const safeItems = extractRows(rawResult);

            const stats = {
                inTreatment: safeItems.filter(item => item.status === 'under treatment' || item.status === 'under consultation').length,
                waiting: safeItems.filter(item => item.status === 'In waiting room').length,
                done: safeItems.filter(item => item.status === 'Treatments are done / Done').length,
                totalToday: safeItems.length
            };
            
            res.status(200).json({ success: true, stats, data: safeItems });
        } catch (error) {
            console.error('Error fetching clinic board:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch queue data' });
        }
    },

    getAvailablePatients: async (req, res) => {
        try {
            const rawResult = await pool.query(`SELECT * FROM patients ORDER BY first_name ASC`);
            
            // Forcefully extract the array
            const safePatients = extractRows(rawResult);
            
            res.status(200).json({ success: true, data: safePatients });
        } catch (error) {
            console.error('Error fetching patients:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch patients' });
        }
    },

    registerPatient: async (req, res) => {
        try {
            const { patient_id, status, student_id, bay } = req.body;
            if (!patient_id) return res.status(400).json({ success: false, message: 'Patient ID is required' });

            const rawResult = await pool.query(
                `INSERT INTO queue (patient_id, status, student_id, bay, arrival_time) VALUES (?, ?, ?, ?, NOW())`,
                [patient_id, status || 'In waiting room', student_id || null, bay || null]
            );

            let insertId = null;
            if (Array.isArray(rawResult) && rawResult) insertId = rawResult.insertId;
            else if (rawResult) insertId = rawResult.insertId;

            res.status(201).json({ success: true, message: 'Patient added to queue', queue_id: insertId });
        } catch (error) {
            console.error('Error registering patient:', error);
            res.status(500).json({ success: false, message: 'Failed to register patient' });
        }
    },

    updateQueueStatus: async (req, res) => {
        try {
            const queueId = req.params.id;
            const { status } = req.body;
            await pool.query('UPDATE queue SET status = ? WHERE id = ?', [status, queueId]);
            res.status(200).json({ success: true, message: `Status updated to ${status}` });
        } catch (error) {
            console.error('Error updating status:', error);
            res.status(500).json({ success: false, message: 'Failed to update status' });
        }
    }
};

module.exports = queueController;