const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const pool = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');
const audit = require('../middleware/audit');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/assets')),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', authenticate, async (req, res) => {
  const { search, city, type } = req.query;
  let q = "SELECT * FROM assets WHERE status='active'";
  const p = [];
  let i = 1;
  if (search) {
    q += ` AND (media_code ILIKE $${i} OR name ILIKE $${i+1} OR location ILIKE $${i+2} OR city ILIKE $${i+3})`;
    p.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); i += 4;
  }
  if (city) { q += ` AND city=$${i++}`; p.push(city); }
  if (type) { q += ` AND type=$${i++}`; p.push(type); }
  q += ' ORDER BY media_code ASC, name ASC';
  try {
    const { rows } = await pool.query(q, p);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/meta/cities', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT DISTINCT city FROM assets WHERE status='active' ORDER BY city");
    res.json(rows.map(r => r.city));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM assets WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Aset tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/check-availability', authenticate, async (req, res) => {
  const { start_date, end_date, exclude_proposal_id } = req.body;
  if (!start_date || !end_date) return res.status(400).json({ error: 'Tanggal wajib diisi' });
  let q = "SELECT * FROM bookings WHERE asset_id=$1 AND status='active' AND NOT (end_date < $2 OR start_date > $3)";
  const p = [req.params.id, start_date, end_date];
  if (exclude_proposal_id) { q += ' AND proposal_id != $4'; p.push(exclude_proposal_id); }
  try {
    const { rows } = await pool.query(q, p);
    res.json({ available: rows.length === 0, conflicts: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorize('admin'), upload.single('photo'), async (req, res) => {
  const { media_code, name, type, location, city, rate_card, net_price, super_net_price, specs } = req.body;
  if (!name || !type || !city || !net_price || !super_net_price)
    return res.status(400).json({ error: 'Field wajib: name, type, city, net_price, super_net_price' });
  const id = uuidv4();
  const photo_url = req.file ? `/uploads/assets/${req.file.filename}` : null;
  try {
    await pool.query(
      'INSERT INTO assets (id,media_code,name,type,location,city,rate_card,net_price,super_net_price,photo_url,specs,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [id, media_code||null, name, type, location||null, city, parseFloat(rate_card)||0, parseFloat(net_price), parseFloat(super_net_price), photo_url, specs||'{}', req.user.id]
    );
    audit.log(req.user, 'CREATE_ASSET', 'asset', id, name);
    res.status(201).json({ id, message: 'Aset berhasil dibuat' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorize('admin'), upload.single('photo'), async (req, res) => {
  const { media_code, name, type, location, city, rate_card, net_price, super_net_price, specs, status } = req.body;
  const sets = ['updated_at=NOW()'];
  const vals = [];
  let i = 1;
  const add = (col, val) => { if (val !== undefined && val !== null && val !== '') { sets.push(`${col}=$${i++}`); vals.push(val); } };
  add('media_code', media_code); add('name', name); add('type', type);
  add('location', location); add('city', city); add('specs', specs); add('status', status);
  if (rate_card !== undefined) { sets.push(`rate_card=$${i++}`); vals.push(parseFloat(rate_card)||0); }
  if (net_price) { sets.push(`net_price=$${i++}`); vals.push(parseFloat(net_price)); }
  if (super_net_price) { sets.push(`super_net_price=$${i++}`); vals.push(parseFloat(super_net_price)); }
  if (req.file) { sets.push(`photo_url=$${i++}`); vals.push(`/uploads/assets/${req.file.filename}`); }
  vals.push(req.params.id);
  try {
    const { rowCount } = await pool.query(`UPDATE assets SET ${sets.join(',')} WHERE id=$${i}`, vals);
    if (!rowCount) return res.status(404).json({ error: 'Aset tidak ditemukan' });
    audit.log(req.user, 'UPDATE_ASSET', 'asset', req.params.id, name||'');
    res.json({ message: 'Aset diperbarui' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rowCount } = await pool.query("UPDATE assets SET status='inactive',updated_at=NOW() WHERE id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Aset tidak ditemukan' });
    audit.log(req.user, 'DEACTIVATE_ASSET', 'asset', req.params.id);
    res.json({ message: 'Aset dinonaktifkan' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
