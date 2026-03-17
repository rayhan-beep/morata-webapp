import { useState, useEffect } from 'react';
import api, { IDR, fmtDate, fmtDT, STATUS_LABEL, STATUS_BADGE, SPEC_LABELS, parseSpecs } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ProposalDetail({ id, onNav }) {
  const { user } = useAuth();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    api.get(`/proposals/${id}`).then(r => setProposal(r.data))
      .catch(() => setError('Proposal tidak ditemukan'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const approve = async () => {
    setActLoading(true);
    try {
      await api.post(`/proposals/${id}/approve`, { notes });
      setShowApprove(false);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Gagal approve'); }
    finally { setActLoading(false); }
  };

  const reject = async () => {
    if (!notes.trim()) { setError('Catatan penolakan wajib diisi'); return; }
    setActLoading(true);
    try {
      await api.post(`/proposals/${id}/reject`, { notes });
      setShowReject(false);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Gagal reject'); }
    finally { setActLoading(false); }
  };

  const submitProposal = async () => {
    setActLoading(true);
    try {
      await api.post(`/proposals/${id}/submit`);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Gagal submit'); }
    finally { setActLoading(false); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!proposal) return <div className="alert alert-error">{error || 'Proposal tidak ditemukan'}</div>;

  return (
    <div>
      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* Header */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 20, fontWeight: 800 }}>{proposal.proposal_number}</span>
            <span className={`badge ${STATUS_BADGE[proposal.status]}`}>{STATUS_LABEL[proposal.status]}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            Oleh <strong>{proposal.sales_name}</strong> · {fmtDT(proposal.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onNav('proposals')}>← Kembali</button>
          {user?.role === 'sales' && proposal.status === 'draft' && (
            <button className="btn btn-primary" onClick={submitProposal} disabled={actLoading}>
              {actLoading ? '...' : '📤 Submit Approval'}
            </button>
          )}
          {user?.role === 'manager' && proposal.status === 'waiting_approval' && (<>
            <button className="btn btn-danger" onClick={() => { setNotes(''); setError(''); setShowReject(true); }}>✕ Tolak</button>
            <button className="btn btn-success" onClick={() => { setNotes(''); setShowApprove(true); }}>✓ Setujui</button>
          </>)}
        </div>
      </div>

      {/* Manager notes */}
      {proposal.status === 'rejected' && proposal.manager_notes && (
        <div className="alert alert-error" style={{ marginBottom: 18 }}>
          <div><strong>Ditolak oleh {proposal.manager_name}:</strong><br />{proposal.manager_notes}</div>
        </div>
      )}
      {['approved', 'published'].includes(proposal.status) && proposal.manager_notes && (
        <div className="alert alert-success" style={{ marginBottom: 18 }}>
          <div><strong>Catatan {proposal.manager_name}:</strong><br />{proposal.manager_notes}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div>
          {/* Client */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">👤 Informasi Klien</div>
            <div className="grid2">
              <div><div className="form-label">Nama Klien</div><p style={{ fontWeight: 600 }}>{proposal.client_name}</p></div>
              <div><div className="form-label">Perusahaan</div><p>{proposal.client_company || '—'}</p></div>
              <div><div className="form-label">Email</div><p>{proposal.client_email || '—'}</p></div>
              <div><div className="form-label">Telepon</div><p>{proposal.client_phone || '—'}</p></div>
              <div className="col2"><div className="form-label">Kampanye</div><p style={{ fontWeight: 700, fontSize: 15 }}>{proposal.campaign_name}</p></div>
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <div className="card-title">🗺️ Detail Aset OOH</div>
            {proposal.items?.map((item) => {
              const diff = item.price_difference || 0;
              const pct = item.price_difference_pct || 0;
              const specs = parseSpecs(item.asset_specs);
              return (
                <div key={item.id} style={{ border: `1.5px solid ${item.price_type === 'custom' ? '#fcd34d' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 14, marginBottom: 10, background: item.price_type === 'custom' ? '#fffbeb' : 'var(--surface)' }}>
                  <div className="flex-between" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{item.media_code}</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.asset_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {item.asset_type} · {[item.asset_location, item.asset_city].filter(Boolean).join(', ')}
                        {specs.ukuran && ` · 📐 ${specs.ukuran}`}
                      </div>
                    </div>
                    {item.price_type === 'custom' && <span className="badge badge-waiting">Custom Price</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    <div>
                      <div className="form-label">Periode</div>
                      <p style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtDate(item.start_date)} – {fmtDate(item.end_date)}</p>
                      <p style={{ fontSize: 11, color: 'var(--text2)' }}>{item.duration_days} hari</p>
                    </div>
                    <div>
                      <div className="form-label">Tipe Harga</div>
                      <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>{item.price_type.replace('_', ' ')}</p>
                      <p style={{ fontSize: 11, color: 'var(--text2)' }}>{IDR(item.standard_price)}</p>
                    </div>
                    <div>
                      <div className="form-label">Harga Diajukan</div>
                      <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>{IDR(item.proposed_price)}</p>
                    </div>
                    {item.price_type === 'custom' && (
                      <div>
                        <div className="form-label">Selisih</div>
                        <p style={{ fontWeight: 700, color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {diff >= 0 ? '+' : ''}{IDR(diff)}
                        </p>
                        <p style={{ fontSize: 11, color: diff > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {pct >= 0 ? '+' : ''}{pct?.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                  {item.notes && <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 5, fontSize: 12, color: 'var(--text2)' }}>💬 {item.notes}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">💰 Ringkasan</div>
            <div className="flex-between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>Jumlah Aset</span>
              <span style={{ fontWeight: 700 }}>{proposal.items?.length || 0}</span>
            </div>
            <div className="divider" />
            <div className="flex-between">
              <span style={{ fontWeight: 700 }}>TOTAL</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>{IDR(proposal.total_amount)}</span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">⏱️ Timeline</div>
            {[
              { label: 'Dibuat', time: proposal.created_at, done: true },
              { label: 'Disubmit', time: proposal.submitted_at, done: !!proposal.submitted_at },
              { label: 'Direview', time: proposal.reviewed_at, done: !!proposal.reviewed_at },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: t.done ? 'var(--success)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: t.done ? 'white' : 'var(--text3)', flexShrink: 0, marginTop: 2 }}>
                  {t.done ? '✓' : '○'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.done ? 'var(--text)' : 'var(--text3)' }}>{t.label}</div>
                  {t.time && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{fmtDT(t.time)}</div>}
                </div>
              </div>
            ))}
            {proposal.manager_name && (
              <div style={{ marginTop: 4, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 6, fontSize: 12 }}>
                Manager: <strong>{proposal.manager_name}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApprove && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">✅ Setujui Proposal</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowApprove(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
              Menyetujui <strong>{proposal.proposal_number}</strong>. Sistem akan otomatis membuat booking untuk semua aset.
            </p>
            <div className="form-group">
              <label className="form-label">Catatan (opsional)</label>
              <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan untuk sales..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowApprove(false)}>Batal</button>
              <button className="btn btn-success" onClick={approve} disabled={actLoading}>
                {actLoading ? 'Menyetujui...' : '✓ Setujui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showReject && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">✕ Tolak Proposal</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowReject(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Alasan Penolakan *</label>
              <textarea className="form-control" rows={4} value={notes}
                onChange={e => { setNotes(e.target.value); setError(''); }}
                placeholder="Tuliskan alasan dan catatan revisi untuk sales..." />
              <div className="form-hint">Wajib diisi. Sales akan menerima catatan ini.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowReject(false)}>Batal</button>
              <button className="btn btn-danger" onClick={reject} disabled={actLoading}>
                {actLoading ? 'Menolak...' : '✕ Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
