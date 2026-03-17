const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');
const audit = require('../middleware/audit');

function genProposalNumber() {
  const d = new Date();
  return `MRT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`;
}

// GET list
router.get('/', authenticate, (req, res) => {
  const { status, search } = req.query;
  let q = `SELECT p.*, u1.name as sales_name, u2.name as manager_name
           FROM proposals p
           LEFT JOIN users u1 ON p.sales_id=u1.id
           LEFT JOIN users u2 ON p.manager_id=u2.id
           WHERE 1=1`;
  const p = [];
  if (req.user.role === 'sales') { q += ' AND p.sales_id=?'; p.push(req.user.id); }
  if (status) { q += ' AND p.status=?'; p.push(status); }
  if (search) {
    q += ' AND (p.proposal_number LIKE ? OR p.client_name LIKE ? OR p.campaign_name LIKE ?)';
    p.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  q += ' ORDER BY p.created_at DESC';
  db.all(q, p, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET single
router.get('/:id', authenticate, (req, res) => {
  db.get(
    `SELECT p.*, u1.name as sales_name, u1.email as sales_email, u2.name as manager_name
     FROM proposals p
     LEFT JOIN users u1 ON p.sales_id=u1.id
     LEFT JOIN users u2 ON p.manager_id=u2.id
     WHERE p.id=?`,
    [req.params.id],
    (err, proposal) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!proposal) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
      if (req.user.role === 'sales' && proposal.sales_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });

      db.all(
        `SELECT pi.*, a.media_code, a.name as asset_name, a.type as asset_type,
          a.location as asset_location, a.city as asset_city, a.specs as asset_specs, a.photo_url as asset_photo
         FROM proposal_items pi LEFT JOIN assets a ON pi.asset_id=a.id
         WHERE pi.proposal_id=?`,
        [req.params.id],
        (err2, items) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ ...proposal, items });
        }
      );
    }
  );
});

// CREATE
router.post('/', authenticate, authorize('sales'), (req, res) => {
  const { client_name, client_company, client_email, client_phone, campaign_name, items } = req.body;
  if (!client_name || !campaign_name || !items || !items.length) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }
  const id = uuidv4();
  const proposal_number = genProposalNumber();
  const total = items.reduce((s, i) => s + (parseFloat(i.proposed_price) || 0), 0);

  db.run(
    'INSERT INTO proposals (id,proposal_number,client_name,client_company,client_email,client_phone,campaign_name,sales_id,total_amount) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, proposal_number, client_name, client_company||null, client_email||null, client_phone||null, campaign_name, req.user.id, total],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const stmt = db.prepare(
        'INSERT INTO proposal_items (id,proposal_id,asset_id,start_date,end_date,duration_days,price_type,standard_price,proposed_price,price_difference,price_difference_pct,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
      );
      items.forEach(item => {
        const dur = Math.ceil((new Date(item.end_date) - new Date(item.start_date)) / 86400000) + 1;
        const diff = parseFloat(item.proposed_price) - parseFloat(item.standard_price);
        const pct = item.standard_price > 0 ? (diff / item.standard_price * 100) : 0;
        stmt.run([uuidv4(), id, item.asset_id, item.start_date, item.end_date, dur,
          item.price_type, parseFloat(item.standard_price), parseFloat(item.proposed_price),
          diff, pct, item.notes || null]);
      });
      stmt.finalize();

      audit.log(req.user, 'CREATE_PROPOSAL', 'proposal', id, proposal_number);
      res.status(201).json({ id, proposal_number });
    }
  );
});

// UPDATE (sales, draft/rejected only)
router.put('/:id', authenticate, authorize('sales'), (req, res) => {
  db.get('SELECT * FROM proposals WHERE id=? AND sales_id=?', [req.params.id, req.user.id], (err, p) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!p) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    if (!['draft', 'rejected'].includes(p.status)) return res.status(400).json({ error: 'Tidak bisa edit proposal ini' });

    const { client_name, client_company, client_email, client_phone, campaign_name, items } = req.body;
    const total = (items || []).reduce((s, i) => s + (parseFloat(i.proposed_price) || 0), 0);

    db.run(
      "UPDATE proposals SET client_name=?,client_company=?,client_email=?,client_phone=?,campaign_name=?,total_amount=?,status='draft',manager_notes=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      [client_name, client_company||null, client_email||null, client_phone||null, campaign_name, total, req.params.id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (!items || !items.length) return res.json({ message: 'Proposal diperbarui' });

        db.run('DELETE FROM proposal_items WHERE proposal_id=?', [req.params.id], () => {
          const stmt = db.prepare(
            'INSERT INTO proposal_items (id,proposal_id,asset_id,start_date,end_date,duration_days,price_type,standard_price,proposed_price,price_difference,price_difference_pct,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
          );
          items.forEach(item => {
            const dur = Math.ceil((new Date(item.end_date) - new Date(item.start_date)) / 86400000) + 1;
            const diff = parseFloat(item.proposed_price) - parseFloat(item.standard_price);
            const pct = item.standard_price > 0 ? (diff / item.standard_price * 100) : 0;
            stmt.run([uuidv4(), req.params.id, item.asset_id, item.start_date, item.end_date, dur,
              item.price_type, parseFloat(item.standard_price), parseFloat(item.proposed_price), diff, pct, item.notes||null]);
          });
          stmt.finalize();
          res.json({ message: 'Proposal diperbarui' });
        });
      }
    );
  });
});

// SUBMIT
router.post('/:id/submit', authenticate, authorize('sales'), (req, res) => {
  db.get('SELECT * FROM proposals WHERE id=? AND sales_id=?', [req.params.id, req.user.id], (err, p) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!p) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    if (!['draft', 'rejected'].includes(p.status)) return res.status(400).json({ error: 'Status tidak valid untuk submit' });

    db.all('SELECT * FROM proposal_items WHERE proposal_id=?', [req.params.id], (err2, items) => {
      if (err2) return res.status(500).json({ error: err2.message });

      Promise.all(items.map(item => new Promise((resolve, reject) => {
        db.all(
          "SELECT * FROM bookings WHERE asset_id=? AND status='active' AND NOT (end_date<? OR start_date>?) AND (proposal_id IS NULL OR proposal_id!=?)",
          [item.asset_id, item.start_date, item.end_date, req.params.id],
          (e, conflicts) => e ? reject(e) : resolve({ item, conflicts })
        );
      }))).then(results => {
        const blocked = results.filter(r => r.conflicts.length > 0);
        if (blocked.length > 0) return res.status(409).json({ error: 'Aset sudah terboking pada periode tersebut', conflicts: blocked });

        db.run(
          "UPDATE proposals SET status='waiting_approval',submitted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
          [req.params.id],
          (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            audit.log(req.user, 'SUBMIT_PROPOSAL', 'proposal', req.params.id, p.proposal_number);
            res.json({ message: 'Proposal dikirim untuk approval' });
          }
        );
      }).catch(e => res.status(500).json({ error: e.message }));
    });
  });
});

// APPROVE
router.post('/:id/approve', authenticate, authorize('manager'), (req, res) => {
  const { notes } = req.body;
  db.get('SELECT * FROM proposals WHERE id=?', [req.params.id], (err, p) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!p) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    if (p.status !== 'waiting_approval') return res.status(400).json({ error: 'Proposal tidak dalam status waiting approval' });

    db.run(
      "UPDATE proposals SET status='approved',manager_id=?,manager_notes=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      [req.user.id, notes || null, req.params.id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        db.all('SELECT * FROM proposal_items WHERE proposal_id=?', [req.params.id], (err3, items) => {
          if (!err3) {
            const stmt = db.prepare('INSERT INTO bookings (id,asset_id,proposal_id,start_date,end_date) VALUES (?,?,?,?,?)');
            items.forEach(i => stmt.run([uuidv4(), i.asset_id, req.params.id, i.start_date, i.end_date]));
            stmt.finalize();
            db.run("UPDATE proposals SET status='published' WHERE id=?", [req.params.id]);
          }
        });

        audit.log(req.user, 'APPROVE_PROPOSAL', 'proposal', req.params.id, p.proposal_number);
        res.json({ message: 'Proposal disetujui' });
      }
    );
  });
});

// REJECT
router.post('/:id/reject', authenticate, authorize('manager'), (req, res) => {
  const { notes } = req.body;
  if (!notes || !notes.trim()) return res.status(400).json({ error: 'Catatan penolakan wajib diisi' });

  db.get('SELECT * FROM proposals WHERE id=?', [req.params.id], (err, p) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!p) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    if (p.status !== 'waiting_approval') return res.status(400).json({ error: 'Proposal tidak dalam status waiting approval' });

    db.run(
      "UPDATE proposals SET status='rejected',manager_id=?,manager_notes=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      [req.user.id, notes, req.params.id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        audit.log(req.user, 'REJECT_PROPOSAL', 'proposal', req.params.id, p.proposal_number);
        res.json({ message: 'Proposal ditolak' });
      }
    );
  });
});

// DELETE (draft only)
router.delete('/:id', authenticate, authorize('sales', 'admin'), (req, res) => {
  const where = req.user.role === 'sales' ? 'id=? AND sales_id=? AND status="draft"' : 'id=? AND status="draft"';
  const params = req.user.role === 'sales' ? [req.params.id, req.user.id] : [req.params.id, req.params.id];
  db.run(`DELETE FROM proposals WHERE ${where}`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Proposal tidak ditemukan atau tidak bisa dihapus' });
    db.run('DELETE FROM proposal_items WHERE proposal_id=?', [req.params.id]);
    res.json({ message: 'Proposal dihapus' });
  });
});

module.exports = router;
