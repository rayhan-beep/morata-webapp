const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../models/database');
const { authenticate, authorize } = require('../middleware/auth');
const audit = require('../middleware/audit');

function genNumber() {
  const d = new Date();
  return `MRT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`;
}

router.get('/', authenticate, async (req, res) => {
  const { status, search } = req.query;
  let q = `SELECT p.*, u1.name as sales_name, u2.name as manager_name
           FROM proposals p
           LEFT JOIN users u1 ON p.sales_id=u1.id
           LEFT JOIN users u2 ON p.manager_id=u2.id WHERE 1=1`;
  const p = []; let i = 1;
  if (req.user.role === 'sales') { q += ` AND p.sales_id=$${i++}`; p.push(req.user.id); }
  if (status) { q += ` AND p.status=$${i++}`; p.push(status); }
  if (search) {
    q += ` AND (p.proposal_number ILIKE $${i} OR p.client_name ILIKE $${i+1} OR p.campaign_name ILIKE $${i+2})`;
    p.push(`%${search}%`, `%${search}%`, `%${search}%`); i += 3;
  }
  q += ' ORDER BY p.created_at DESC';
  try { const { rows } = await pool.query(q, p); res.json(rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u1.name as sales_name, u1.email as sales_email, u2.name as manager_name
       FROM proposals p LEFT JOIN users u1 ON p.sales_id=u1.id LEFT JOIN users u2 ON p.manager_id=u2.id
       WHERE p.id=$1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    const proposal = rows[0];
    if (req.user.role === 'sales' && proposal.sales_id !== req.user.id) return res.status(403).json({ error: 'Akses ditolak' });
    const { rows: items } = await pool.query(
      `SELECT pi.*, a.media_code, a.name as asset_name, a.type as asset_type,
        a.location as asset_location, a.city as asset_city, a.specs as asset_specs, a.photo_url as asset_photo
       FROM proposal_items pi LEFT JOIN assets a ON pi.asset_id=a.id WHERE pi.proposal_id=$1`, [req.params.id]);
    res.json({ ...proposal, items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorize('sales'), async (req, res) => {
  const { client_name, client_company, client_email, client_phone, campaign_name, items } = req.body;
  if (!client_name || !campaign_name || !items || !items.length) return res.status(400).json({ error: 'Data tidak lengkap' });
  const id = uuidv4();
  const proposal_number = genNumber();
  const total = items.reduce((s, i) => s + (parseFloat(i.proposed_price)||0), 0);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO proposals (id,proposal_number,client_name,client_company,client_email,client_phone,campaign_name,sales_id,total_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, proposal_number, client_name, client_company||null, client_email||null, client_phone||null, campaign_name, req.user.id, total]);
    for (const item of items) {
      const dur = Math.ceil((new Date(item.end_date) - new Date(item.start_date)) / 86400000) + 1;
      const diff = parseFloat(item.proposed_price) - parseFloat(item.standard_price);
      const pct = item.standard_price > 0 ? (diff / item.standard_price * 100) : 0;
      await client.query(
        'INSERT INTO proposal_items (id,proposal_id,asset_id,start_date,end_date,duration_days,price_type,standard_price,proposed_price,price_difference,price_difference_pct,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [uuidv4(), id, item.asset_id, item.start_date, item.end_date, dur, item.price_type, parseFloat(item.standard_price), parseFloat(item.proposed_price), diff, pct, item.notes||null]);
    }
    await client.query('COMMIT');
    audit.log(req.user, 'CREATE_PROPOSAL', 'proposal', id, proposal_number);
    res.status(201).json({ id, proposal_number });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

router.put('/:id', authenticate, authorize('sales'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM proposals WHERE id=$1 AND sales_id=$2', [req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
  if (!['draft','rejected'].includes(rows[0].status)) return res.status(400).json({ error: 'Tidak bisa edit proposal ini' });
  const { client_name, client_company, client_email, client_phone, campaign_name, items } = req.body;
  const total = (items||[]).reduce((s, i) => s + (parseFloat(i.proposed_price)||0), 0);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "UPDATE proposals SET client_name=$1,client_company=$2,client_email=$3,client_phone=$4,campaign_name=$5,total_amount=$6,status='draft',manager_notes=NULL,updated_at=NOW() WHERE id=$7",
      [client_name, client_company||null, client_email||null, client_phone||null, campaign_name, total, req.params.id]);
    if (items && items.length) {
      await client.query('DELETE FROM proposal_items WHERE proposal_id=$1', [req.params.id]);
      for (const item of items) {
        const dur = Math.ceil((new Date(item.end_date) - new Date(item.start_date)) / 86400000) + 1;
        const diff = parseFloat(item.proposed_price) - parseFloat(item.standard_price);
        const pct = item.standard_price > 0 ? (diff / item.standard_price * 100) : 0;
        await client.query(
          'INSERT INTO proposal_items (id,proposal_id,asset_id,start_date,end_date,duration_days,price_type,standard_price,proposed_price,price_difference,price_difference_pct,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
          [uuidv4(), req.params.id, item.asset_id, item.start_date, item.end_date, dur, item.price_type, parseFloat(item.standard_price), parseFloat(item.proposed_price), diff, pct, item.notes||null]);
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Proposal diperbarui' });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

router.post('/:id/submit', authenticate, authorize('sales'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM proposals WHERE id=$1 AND sales_id=$2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    if (!['draft','rejected'].includes(rows[0].status)) return res.status(400).json({ error: 'Status tidak valid' });
    const { rows: items } = await pool.query('SELECT * FROM proposal_items WHERE proposal_id=$1', [req.params.id]);
    for (const item of items) {
      const { rows: conflicts } = await pool.query(
        "SELECT * FROM bookings WHERE asset_id=$1 AND status='active' AND NOT (end_date<$2 OR start_date>$3) AND (proposal_id IS NULL OR proposal_id!=$4)",
        [item.asset_id, item.start_date, item.end_date, req.params.id]);
      if (conflicts.length > 0) return res.status(409).json({ error: 'Aset sudah terboking pada periode tersebut' });
    }
    await pool.query("UPDATE proposals SET status='waiting_approval',submitted_at=NOW(),updated_at=NOW() WHERE id=$1", [req.params.id]);
    audit.log(req.user, 'SUBMIT_PROPOSAL', 'proposal', req.params.id, rows[0].proposal_number);
    res.json({ message: 'Proposal dikirim untuk approval' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', authenticate, authorize('manager'), async (req, res) => {
  const { notes } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM proposals WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    if (rows[0].status !== 'waiting_approval') return res.status(400).json({ error: 'Proposal tidak dalam status waiting approval' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "UPDATE proposals SET status='published',manager_id=$1,manager_notes=$2,reviewed_at=NOW(),updated_at=NOW() WHERE id=$3",
        [req.user.id, notes||null, req.params.id]);
      const { rows: items } = await client.query('SELECT * FROM proposal_items WHERE proposal_id=$1', [req.params.id]);
      for (const item of items) {
        await client.query('INSERT INTO bookings (id,asset_id,proposal_id,start_date,end_date) VALUES ($1,$2,$3,$4,$5)',
          [uuidv4(), item.asset_id, req.params.id, item.start_date, item.end_date]);
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
    audit.log(req.user, 'APPROVE_PROPOSAL', 'proposal', req.params.id, rows[0].proposal_number);
    res.json({ message: 'Proposal disetujui' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/reject', authenticate, authorize('manager'), async (req, res) => {
  const { notes } = req.body;
  if (!notes || !notes.trim()) return res.status(400).json({ error: 'Catatan penolakan wajib diisi' });
  try {
    const { rows } = await pool.query('SELECT * FROM proposals WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    if (rows[0].status !== 'waiting_approval') return res.status(400).json({ error: 'Proposal tidak dalam status waiting approval' });
    await pool.query(
      "UPDATE proposals SET status='rejected',manager_id=$1,manager_notes=$2,reviewed_at=NOW(),updated_at=NOW() WHERE id=$3",
      [req.user.id, notes, req.params.id]);
    audit.log(req.user, 'REJECT_PROPOSAL', 'proposal', req.params.id, rows[0].proposal_number);
    res.json({ message: 'Proposal ditolak' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('sales','admin'), async (req, res) => {
  try {
    let q, p;
    if (req.user.role === 'sales') { q = "DELETE FROM proposals WHERE id=$1 AND sales_id=$2 AND status='draft'"; p = [req.params.id, req.user.id]; }
    else { q = "DELETE FROM proposals WHERE id=$1 AND status='draft'"; p = [req.params.id]; }
    const { rowCount } = await pool.query(q, p);
    if (!rowCount) return res.status(404).json({ error: 'Proposal tidak ditemukan atau tidak bisa dihapus' });
    await pool.query('DELETE FROM proposal_items WHERE proposal_id=$1', [req.params.id]);
    res.json({ message: 'Proposal dihapus' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
