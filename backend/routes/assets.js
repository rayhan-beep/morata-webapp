const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const db = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');
const audit = require('../middleware/audit');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/assets')),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET all with search/filter
router.get('/', authenticate, (req, res) => {
  const { search, city, type } = req.query;
  let q = "SELECT * FROM assets WHERE status='active'";
  const p = [];
  if (search) {
    q += ' AND (media_code LIKE ? OR name LIKE ? OR location LIKE ? OR city LIKE ?)';
    p.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (city) { q += ' AND city=?'; p.push(city); }
  if (type) { q += ' AND type=?'; p.push(type); }
  q += ' ORDER BY media_code ASC, name ASC';
  db.all(q, p, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET single
router.get('/:id', authenticate, (req, res) => {
  db.get('SELECT * FROM assets WHERE id=?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Aset tidak ditemukan' });
    res.json(row);
  });
});

// GET cities
router.get('/meta/cities', authenticate, (req, res) => {
  db.all("SELECT DISTINCT city FROM assets WHERE status='active' ORDER BY city", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.city));
  });
});

// Check availability
router.post('/:id/check-availability', authenticate, (req, res) => {
  const { start_date, end_date, exclude_proposal_id } = req.body;
  if (!start_date || !end_date) return res.status(400).json({ error: 'Tanggal wajib diisi' });
  let q = "SELECT * FROM bookings WHERE asset_id=? AND status='active' AND NOT (end_date < ? OR start_date > ?)";
  const p = [req.params.id, start_date, end_date];
  if (exclude_proposal_id) { q += ' AND proposal_id != ?'; p.push(exclude_proposal_id); }
  db.all(q, p, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ available: rows.length === 0, conflicts: rows });
  });
});

// CREATE
router.post('/', authenticate, authorize('admin'), upload.single('photo'), (req, res) => {
  const { media_code, name, type, location, city, rate_card, net_price, super_net_price, specs } = req.body;
  if (!name || !type || !city || !net_price || !super_net_price) {
    return res.status(400).json({ error: 'Field wajib: name, type, city, net_price, super_net_price' });
  }
  const id = uuidv4();
  const photo_url = req.file ? `/uploads/assets/${req.file.filename}` : null;
  db.run(
    'INSERT INTO assets (id,media_code,name,type,location,city,rate_card,net_price,super_net_price,photo_url,specs,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [id, media_code || null, name, type, location || null, city,
     parseFloat(rate_card) || 0, parseFloat(net_price), parseFloat(super_net_price),
     photo_url, specs || '{}', req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      audit.log(req.user, 'CREATE_ASSET', 'asset', id, name);
      res.status(201).json({ id, message: 'Aset berhasil dibuat' });
    }
  );
});

// UPDATE
router.put('/:id', authenticate, authorize('admin'), upload.single('photo'), (req, res) => {
  const { media_code, name, type, location, city, rate_card, net_price, super_net_price, specs, status } = req.body;
  const sets = ['updated_at=CURRENT_TIMESTAMP'];
  const vals = [];
  const addField = (col, val) => { if (val !== undefined && val !== null) { sets.push(`${col}=?`); vals.push(val); } };
  addField('media_code', media_code);
  addField('name', name);
  addField('type', type);
  addField('location', location);
  addField('city', city);
  addField('specs', specs);
  addField('status', status);
  if (rate_card !== undefined) { sets.push('rate_card=?'); vals.push(parseFloat(rate_card) || 0); }
  if (net_price) { sets.push('net_price=?'); vals.push(parseFloat(net_price)); }
  if (super_net_price) { sets.push('super_net_price=?'); vals.push(parseFloat(super_net_price)); }
  if (req.file) { sets.push('photo_url=?'); vals.push(`/uploads/assets/${req.file.filename}`); }
  vals.push(req.params.id);
  db.run(`UPDATE assets SET ${sets.join(',')} WHERE id=?`, vals, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Aset tidak ditemukan' });
    audit.log(req.user, 'UPDATE_ASSET', 'asset', req.params.id, name || '');
    res.json({ message: 'Aset diperbarui' });
  });
});

// DEACTIVATE
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  db.run("UPDATE assets SET status='inactive',updated_at=CURRENT_TIMESTAMP WHERE id=?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Aset tidak ditemukan' });
    audit.log(req.user, 'DEACTIVATE_ASSET', 'asset', req.params.id);
    res.json({ message: 'Aset dinonaktifkan' });
  });
});

module.exports = router;
