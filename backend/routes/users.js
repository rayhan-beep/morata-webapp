const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin'), (req, res) => {
  db.all('SELECT id,name,email,role,created_at FROM users ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Semua field wajib diisi' });
  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  db.run('INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)', [id, name, email, hashed, role], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email sudah digunakan' });
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id, name, email, role });
  });
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, role, password } = req.body;
  const sets = ['updated_at=CURRENT_TIMESTAMP'];
  const vals = [];
  if (name) { sets.push('name=?'); vals.push(name); }
  if (email) { sets.push('email=?'); vals.push(email); }
  if (role) { sets.push('role=?'); vals.push(role); }
  if (password) { sets.push('password=?'); vals.push(await bcrypt.hash(password, 10)); }
  vals.push(req.params.id);
  db.run(`UPDATE users SET ${sets.join(',')} WHERE id=?`, vals, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ message: 'User diperbarui' });
  });
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  db.run('DELETE FROM users WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ message: 'User dihapus' });
  });
});

module.exports = router;
