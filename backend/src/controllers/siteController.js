import pool from '../config/db.js';

export const createSite = async (req, res, next) => {
  try {
    const { site_name, location } = req.body;
    const contractorId = req.user.id;

    if (!site_name || typeof site_name !== 'string' || !site_name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'site_name is required.',
      });
    }

    const trimmedSiteName = site_name.trim();
    const trimmedLocation = location && typeof location === 'string' ? location.trim() : null;

    const result = await pool.query(
      `INSERT INTO sites (contractor_id, site_name, location)
       VALUES ($1, $2, $3)
       RETURNING id, contractor_id, site_name, location, created_at`,
      [contractorId, trimmedSiteName, trimmedLocation]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Site created successfully.',
      site: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getSites = async (req, res, next) => {
  try {
    const contractorId = req.user.id;

    const result = await pool.query(
      `SELECT id, contractor_id, site_name, location, created_at
       FROM sites
       WHERE contractor_id = $1
       ORDER BY created_at DESC`,
      [contractorId]
    );

    return res.status(200).json({
      status: 'success',
      sites: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getSiteById = async (req, res, next) => {
  try {
    const siteId = req.params.id;
    const contractorId = req.user.id;

    const result = await pool.query(
      `SELECT id, contractor_id, site_name, location, created_at
       FROM sites
       WHERE id = $1 AND contractor_id = $2`,
      [siteId, contractorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Site not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      site: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateSite = async (req, res, next) => {
  try {
    const siteId = req.params.id;
    const contractorId = req.user.id;
    const { site_name, location } = req.body;

    if (site_name !== undefined && (typeof site_name !== 'string' || !site_name.trim())) {
      return res.status(400).json({
        status: 'error',
        message: 'site_name cannot be empty.',
      });
    }

    // Check ownership & existence
    const existing = await pool.query(
      'SELECT id, site_name, location FROM sites WHERE id = $1 AND contractor_id = $2',
      [siteId, contractorId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Site not found.',
      });
    }

    const newSiteName = site_name !== undefined ? site_name.trim() : existing.rows[0].site_name;
    const newLocation = location !== undefined ? (typeof location === 'string' ? location.trim() : null) : existing.rows[0].location;

    const updateResult = await pool.query(
      `UPDATE sites
       SET site_name = $1, location = $2
       WHERE id = $3 AND contractor_id = $4
       RETURNING id, contractor_id, site_name, location, created_at`,
      [newSiteName, newLocation, siteId, contractorId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Site updated successfully.',
      site: updateResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSite = async (req, res, next) => {
  try {
    const siteId = req.params.id;
    const contractorId = req.user.id;

    const result = await pool.query(
      'DELETE FROM sites WHERE id = $1 AND contractor_id = $2 RETURNING id',
      [siteId, contractorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Site not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Site deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
