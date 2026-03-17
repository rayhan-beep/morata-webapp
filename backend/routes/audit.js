const router = require('express').Router();
const db = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin', 'manager'), (req, res) => {
  db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 300', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
