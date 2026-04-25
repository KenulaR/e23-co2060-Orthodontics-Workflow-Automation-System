const { query, remove } = require('../config/database');

const QUEUE_STATUS = {
  WAITING: 'In waiting room',
  TREATMENT: 'under treatment',
  DONE: 'Treatments are done / Done'
};

const ACTIVE_QUEUE_STATUSES = [
  QUEUE_STATUS.WAITING,
  QUEUE_STATUS.TREATMENT
];

const QUEUE_READ_ROLES = new Set(['ADMIN', 'ORTHODONTIST', 'DENTAL_SURGEON', 'NURSE', 'STUDENT', 'RECEPTION']);
const QUEUE_MUTATE_ROLES = new Set(['ADMIN', 'ORTHODONTIST', 'DENTAL_SURGEON', 'RECEPTION']);

const canReadQueue = (role) => QUEUE_READ_ROLES.has(role);

const canAddQueuePatient = (role) => QUEUE_MUTATE_ROLES.has(role);

const canRemoveQueuePatient = (role) => QUEUE_MUTATE_ROLES.has(role);

const buildForbiddenResponse = (res, message = 'You do not have access to the clinic queue') =>
  res.status(403).json({ success: false, message });

const getQueueReadScope = (user) => {
  if (!user) return { allowed: false };
  if (!canReadQueue(user.role)) return { allowed: false };

  return { allowed: true };
};

const buildQueueFilter = (user) => {
  const scope = getQueueReadScope(user);
  if (!scope.allowed) {
    return null;
  }

  return {
    whereClause: '',
    params: []
  };
};

const canUpdateQueueEntry = async (user, queueEntry) => {
  if (!user || !queueEntry) return false;
  return QUEUE_MUTATE_ROLES.has(user.role);
};

const buildStats = (items) => {
  const inTreatment = items.filter((item) => item.status === QUEUE_STATUS.TREATMENT).length;
  const waiting = items.filter((item) => item.status === QUEUE_STATUS.WAITING).length;
  const done = items.filter((item) => item.status === QUEUE_STATUS.DONE).length;
  const totalToday = items.length;

  return {
    inTreatment,
    waiting,
    done,
    totalToday,
    statistics: {
      in_treatment_count: inTreatment,
      waiting_count: waiting,
      completed_count: done,
      total_today: totalToday
    }
  };
};

const getTodayQueueItems = async (user) => {
  const filter = buildQueueFilter(user);
  if (!filter) return null;

  return query(
    `
      SELECT
        q.id AS queue_id,
        q.status,
        q.bay,
        q.arrival_time,
        q.start_time,
        q.completion_time,
        p.id AS patient_id,
        p.patient_code,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        s.id AS student_id,
        s.name AS student_name,
        CASE
          WHEN ? IN ('ADMIN', 'ORTHODONTIST', 'DENTAL_SURGEON', 'RECEPTION') THEN TRUE
          ELSE FALSE
        END AS can_update
      FROM queue q
      JOIN patients p ON q.patient_id = p.id
      LEFT JOIN users s ON q.student_id = s.id
      WHERE DATE(q.arrival_time) = CURDATE()
        AND p.deleted_at IS NULL
        ${filter.whereClause}
      ORDER BY
        FIELD(q.status, ?, ?, ?),
        q.arrival_time ASC
    `,
    [
      user.role,
      ...filter.params,
      QUEUE_STATUS.TREATMENT,
      QUEUE_STATUS.WAITING,
      QUEUE_STATUS.DONE
    ]
  );
};

const queueController = {
  getClinicBoard: async (req, res) => {
    try {
      const items = await getTodayQueueItems(req.user);
      if (!items) {
        return buildForbiddenResponse(res);
      }
      const stats = buildStats(items);

      res.status(200).json({
        success: true,
        stats: {
          inTreatment: stats.inTreatment,
          waiting: stats.waiting,
          done: stats.done,
          totalToday: stats.totalToday
        },
        statistics: stats.statistics,
        data: items
      });
    } catch (error) {
      console.error('Error fetching clinic board:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch queue data' });
    }
  },

  getQueueStats: async (req, res) => {
    try {
      const items = await getTodayQueueItems(req.user);
      if (!items) {
        return buildForbiddenResponse(res);
      }
      const stats = buildStats(items);

      res.status(200).json({
        success: true,
        data: {
          stats: {
            inTreatment: stats.inTreatment,
            waiting: stats.waiting,
            done: stats.done,
            totalToday: stats.totalToday
          },
          statistics: stats.statistics
        }
      });
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch queue statistics' });
    }
  },

  getAvailablePatients: async (req, res) => {
    try {
      if (!canAddQueuePatient(req.user?.role)) {
        return buildForbiddenResponse(res, 'Your role cannot add patients to the clinic queue');
      }

      const patients = await query(
        `
          SELECT p.id, p.patient_code, p.first_name, p.last_name, p.status
          FROM patients p
          WHERE p.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM queue q
              WHERE q.patient_id = p.id
                AND DATE(q.arrival_time) = CURDATE()
                AND q.status IN (?, ?)
            )
          ORDER BY p.first_name ASC, p.last_name ASC, p.patient_code ASC
        `,
        ACTIVE_QUEUE_STATUSES
      );

      res.status(200).json({ success: true, data: patients });
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch patients' });
    }
  },

  registerPatient: async (req, res) => {
    try {
      if (!canAddQueuePatient(req.user?.role)) {
        return buildForbiddenResponse(res, 'Your role cannot add patients to the clinic queue');
      }

      const { patient_id, status, student_id, bay } = req.body;
      const queueStatus = status || QUEUE_STATUS.WAITING;

      const patients = await query(
        'SELECT id FROM patients WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [patient_id]
      );
      if (!patients.length) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      const existingActiveEntries = await query(
        `
          SELECT id, status
          FROM queue
          WHERE patient_id = ?
            AND DATE(arrival_time) = CURDATE()
            AND status IN (?, ?)
          LIMIT 1
        `,
        [patient_id, ...ACTIVE_QUEUE_STATUSES]
      );

      if (existingActiveEntries.length) {
        return res.status(409).json({
          success: false,
          message: 'Patient is already in today\'s active queue'
        });
      }

      const startTimeSql = queueStatus === QUEUE_STATUS.TREATMENT
        ? 'NOW()'
        : 'NULL';
      const completionTimeSql = queueStatus === QUEUE_STATUS.DONE ? 'NOW()' : 'NULL';

      const result = await query(
        `
          INSERT INTO queue
            (patient_id, status, student_id, bay, arrival_time, start_time, completion_time)
          VALUES
            (?, ?, ?, ?, NOW(), ${startTimeSql}, ${completionTimeSql})
        `,
        [patient_id, queueStatus, student_id || null, bay || null]
      );

      res.status(201).json({
        success: true,
        message: 'Patient added to queue',
        queue_id: result.insertId
      });
    } catch (error) {
      console.error('Error registering patient:', error);
      res.status(500).json({ success: false, message: 'Failed to register patient' });
    }
  },

  updateQueueStatus: async (req, res) => {
    try {
      const queueId = req.params.id;
      const { status } = req.body;

      const existingEntries = await query(
        `SELECT id, patient_id, status
         FROM queue
         WHERE id = ?
         LIMIT 1`,
        [queueId]
      );
      if (!existingEntries.length) {
        return res.status(404).json({ success: false, message: 'Queue entry not found' });
      }

      const [queueEntry] = existingEntries;
      const allowed = await canUpdateQueueEntry(req.user, queueEntry);
      if (!allowed) {
        return buildForbiddenResponse(
          res,
          'Your role cannot update clinic queue status'
        );
      }

      await query(
        `
          UPDATE queue
          SET
            status = ?,
            start_time = CASE
              WHEN ? = ? AND start_time IS NULL THEN NOW()
              WHEN ? = ? THEN NULL
              ELSE start_time
            END,
            completion_time = CASE
              WHEN ? = ? THEN NOW()
              ELSE NULL
            END
          WHERE id = ?
        `,
        [
          status,
          status,
          QUEUE_STATUS.TREATMENT,
          status,
          QUEUE_STATUS.WAITING,
          status,
          QUEUE_STATUS.DONE,
          queueId
        ]
      );

      res.status(200).json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ success: false, message: 'Failed to update status' });
    }
  },

  removeQueueEntry: async (req, res) => {
    try {
      if (!canRemoveQueuePatient(req.user?.role)) {
        return buildForbiddenResponse(res, 'Your role cannot remove patients from the clinic queue');
      }

      const affectedRows = await remove('queue', { id: req.params.id }, false);
      if (!affectedRows) {
        return res.status(404).json({ success: false, message: 'Queue entry not found' });
      }

      res.status(200).json({ success: true, message: 'Queue entry removed' });
    } catch (error) {
      console.error('Error removing queue entry:', error);
      res.status(500).json({ success: false, message: 'Failed to remove queue entry' });
    }
  }
};

module.exports = queueController;
