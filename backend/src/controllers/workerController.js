import pool from '../config/db.js';

export const createWorker = async (req, res, next) => {
  try {
    const { name, role, daily_wage } = req.body;
    const contractorId = req.user.id;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'name is required.',
      });
    }

    if (!role || typeof role !== 'string' || !role.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'role is required.',
      });
    }

    const numericWage = Number(daily_wage);
    if (daily_wage === undefined || daily_wage === null || isNaN(numericWage) || numericWage < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'daily_wage must be a non-negative number.',
      });
    }

    const result = await pool.query(
      `INSERT INTO workers (contractor_id, name, role, daily_wage)
       VALUES ($1, $2, $3, $4)
       RETURNING id, contractor_id, name, role, daily_wage, created_at`,
      [contractorId, name.trim(), role.trim(), numericWage]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Worker created successfully.',
      worker: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkers = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const { site_id } = req.query;

    let queryText = `
      SELECT 
         w.id, w.contractor_id, w.name, w.role, w.daily_wage, w.created_at,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT('id', s.id, 'site_name', s.site_name, 'location', s.location, 'assigned_at', wsa.assigned_at)
           ) FILTER (WHERE s.id IS NOT NULL), '[]'
         ) AS assigned_sites
       FROM workers w
       LEFT JOIN worker_site_assignments wsa ON w.id = wsa.worker_id
       LEFT JOIN sites s ON wsa.site_id = s.id AND s.contractor_id = $1
       WHERE w.contractor_id = $1
    `;
    const queryParams = [contractorId];

    if (site_id) {
      queryText += ` AND EXISTS (
        SELECT 1 FROM worker_site_assignments wsa2
        WHERE wsa2.worker_id = w.id AND wsa2.site_id = $2
      )`;
      queryParams.push(site_id);
    }

    queryText += ` GROUP BY w.id ORDER BY w.created_at DESC`;

    const result = await pool.query(queryText, queryParams);

    return res.status(200).json({
      status: 'success',
      workers: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerById = async (req, res, next) => {
  try {
    const workerId = req.params.id;
    const contractorId = req.user.id;

    const result = await pool.query(
      `SELECT 
         w.id, w.contractor_id, w.name, w.role, w.daily_wage, w.created_at,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT('id', s.id, 'site_name', s.site_name, 'location', s.location, 'assigned_at', wsa.assigned_at)
           ) FILTER (WHERE s.id IS NOT NULL), '[]'
         ) AS assigned_sites
       FROM workers w
       LEFT JOIN worker_site_assignments wsa ON w.id = wsa.worker_id
       LEFT JOIN sites s ON wsa.site_id = s.id AND s.contractor_id = $1
       WHERE w.id = $2 AND w.contractor_id = $1
       GROUP BY w.id`,
      [contractorId, workerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      worker: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorker = async (req, res, next) => {
  try {
    const workerId = req.params.id;
    const contractorId = req.user.id;
    const { name, role, daily_wage } = req.body;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({
        status: 'error',
        message: 'name cannot be empty.',
      });
    }

    if (role !== undefined && (typeof role !== 'string' || !role.trim())) {
      return res.status(400).json({
        status: 'error',
        message: 'role cannot be empty.',
      });
    }

    if (daily_wage !== undefined) {
      const numericWage = Number(daily_wage);
      if (isNaN(numericWage) || numericWage < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'daily_wage must be a non-negative number.',
        });
      }
    }

    const existing = await pool.query(
      'SELECT id, name, role, daily_wage FROM workers WHERE id = $1 AND contractor_id = $2',
      [workerId, contractorId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found.',
      });
    }

    const newName = name !== undefined ? name.trim() : existing.rows[0].name;
    const newRole = role !== undefined ? role.trim() : existing.rows[0].role;
    const newWage = daily_wage !== undefined ? Number(daily_wage) : existing.rows[0].daily_wage;

    const updateResult = await pool.query(
      `UPDATE workers
       SET name = $1, role = $2, daily_wage = $3
       WHERE id = $4 AND contractor_id = $5
       RETURNING id, contractor_id, name, role, daily_wage, created_at`,
      [newName, newRole, newWage, workerId, contractorId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Worker updated successfully.',
      worker: updateResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorker = async (req, res, next) => {
  try {
    const workerId = req.params.id;
    const contractorId = req.user.id;

    const result = await pool.query(
      'DELETE FROM workers WHERE id = $1 AND contractor_id = $2 RETURNING id',
      [workerId, contractorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Worker deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const assignWorkerToSite = async (req, res, next) => {
  try {
    const workerId = req.params.id;
    const { site_id } = req.body;
    const contractorId = req.user.id;

    if (!site_id) {
      return res.status(400).json({
        status: 'error',
        message: 'site_id is required.',
      });
    }

    // Verify worker ownership by authenticated contractor
    const workerCheck = await pool.query(
      'SELECT id FROM workers WHERE id = $1 AND contractor_id = $2',
      [workerId, contractorId]
    );
    if (workerCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found.',
      });
    }

    // Verify site ownership by authenticated contractor
    const siteCheck = await pool.query(
      'SELECT id FROM sites WHERE id = $1 AND contractor_id = $2',
      [site_id, contractorId]
    );
    if (siteCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Site not found.',
      });
    }

    // Insert assignment
    const result = await pool.query(
      `INSERT INTO worker_site_assignments (worker_id, site_id)
       VALUES ($1, $2)
       RETURNING id, worker_id, site_id, assigned_at`,
      [workerId, site_id]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Worker assigned to site successfully.',
      assignment: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        status: 'error',
        message: 'Worker is already assigned to this site.',
      });
    }
    next(error);
  }
};

export const getWorkerAssignedSites = async (req, res, next) => {
  try {
    const workerId = req.params.id;
    const contractorId = req.user.id;

    // Verify worker ownership
    const workerCheck = await pool.query(
      'SELECT id FROM workers WHERE id = $1 AND contractor_id = $2',
      [workerId, contractorId]
    );
    if (workerCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found.',
      });
    }

    const result = await pool.query(
      `SELECT s.id, s.site_name, s.location, wsa.assigned_at
       FROM worker_site_assignments wsa
       JOIN sites s ON wsa.site_id = s.id
       WHERE wsa.worker_id = $1 AND s.contractor_id = $2
       ORDER BY wsa.assigned_at DESC`,
      [workerId, contractorId]
    );

    return res.status(200).json({
      status: 'success',
      sites: result.rows,
    });
  } catch (error) {
    next(error);
  }
};
