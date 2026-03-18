const router = require('express').Router();
const pool = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin','manager'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 300');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
