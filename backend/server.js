require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload dirs
['uploads/assets', 'uploads/proposals'].forEach(d => {
  const p = path.join(__dirname, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/audit', require('./routes/audit'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Dashboard stats
app.get('/api/stats', require('./middleware/auth').authenticate, (req, res) => {
  const db = require('./models/database');
  Promise.all([
    new Promise(r => db.get("SELECT COUNT(*) c FROM assets WHERE status='active'", [], (e, row) => r(row?.c || 0))),
    new Promise(r => db.get("SELECT COUNT(*) c FROM proposals", [], (e, row) => r(row?.c || 0))),
    new Promise(r => db.get("SELECT COUNT(*) c FROM proposals WHERE status='waiting_approval'", [], (e, row) => r(row?.c || 0))),
    new Promise(r => db.get("SELECT COUNT(*) c FROM proposals WHERE status IN ('approved','published')", [], (e, row) => r(row?.c || 0))),
    new Promise(r => db.get("SELECT SUM(total_amount) s FROM proposals WHERE status IN ('approved','published')", [], (e, row) => r(row?.s || 0))),
    new Promise(r => {
      if (req.user.role === 'sales') {
        db.get("SELECT COUNT(*) c FROM proposals WHERE sales_id=?", [req.user.id], (e, row) => r(row?.c || 0));
      } else r(0);
    }),
  ]).then(([assets, total, pending, approved, revenue, my_proposals]) => {
    res.json({ assets, total_proposals: total, pending, approved, revenue, my_proposals });
  });
});

app.listen(PORT, () => console.log(`🚀 Morata API running on http://localhost:${PORT}`));
