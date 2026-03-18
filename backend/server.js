require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

['uploads/assets','uploads/proposals'].forEach(d => {
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

app.get('/api/stats', require('./middleware/auth').authenticate, async (req, res) => {
  const pool = require('./models/database');
  try {
    const [assets, total, pending, approved, revenue, my] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM assets WHERE status='active'"),
      pool.query("SELECT COUNT(*) FROM proposals"),
      pool.query("SELECT COUNT(*) FROM proposals WHERE status='waiting_approval'"),
      pool.query("SELECT COUNT(*) FROM proposals WHERE status IN ('approved','published')"),
      pool.query("SELECT SUM(total_amount) FROM proposals WHERE status IN ('approved','published')"),
      req.user.role === 'sales'
        ? pool.query("SELECT COUNT(*) FROM proposals WHERE sales_id=$1", [req.user.id])
        : Promise.resolve({ rows: [{ count: 0 }] }),
    ]);
    res.json({
      assets: parseInt(assets.rows[0].count),
      total_proposals: parseInt(total.rows[0].count),
      pending: parseInt(pending.rows[0].count),
      approved: parseInt(approved.rows[0].count),
      revenue: parseFloat(revenue.rows[0].sum) || 0,
      my_proposals: parseInt(my.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`🚀 Morata API running on http://localhost:${PORT}`));
