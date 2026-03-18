const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id,name,email,role,created_at FROM users ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Semua field wajib diisi' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await pool.query('INSERT INTO users (id,name,email,password,role) VALUES ($1,$2,$3,$4,$5)', [id, name, email, hashed, role]);
    res.status(201).json({ id, name, email, role });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email sudah digunakan' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, role, password } = req.body;
  const sets = ['updated_at=NOW()'];
  const vals = [];
  let i = 1;
  if (name) { sets.push(`name=$${i++}`); vals.push(name); }
  if (email) { sets.push(`email=$${i++}`); vals.push(email); }
  if (role) { sets.push(`role=$${i++}`); vals.push(role); }
  if (password) { sets.push(`password=$${i++}`); vals.push(await bcrypt.hash(password, 10)); }
  vals.push(req.params.id);
  try {
    const { rowCount } = await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=$${i}`, vals);
    if (!rowCount) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ message: 'User diperbarui' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ message: 'User dihapus' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
