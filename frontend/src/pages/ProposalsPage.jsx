import { useState, useEffect } from 'react';
import api, { IDR, fmtDT, STATUS_LABEL, STATUS_BADGE } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ProposalsPage({ onNav, filterStatus }) {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(filterStatus || '');

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    api.get(`/proposals?${p}`).then(r => setProposals(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, status]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input placeholder="No. proposal, klien, kampanye..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="waiting_approval">Menunggu Approval</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="published">Published</option>
        </select>
        <div style={{ flex: 1 }} />
        {user?.role === 'sales' && (
          <button className="btn btn-primary" onClick={() => onNav('create')}>+ Buat Proposal</button>
        )}
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            {filterStatus === 'waiting_approval' ? '⏳ Menunggu Review' : 'Daftar Proposal'}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{proposals.length} proposal</span>
        </div>

        {loading ? <div className="loading"><div className="spinner" /></div>
          : proposals.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <h3>Tidak ada proposal</h3>
              <p>{user?.role === 'sales' ? 'Buat proposal pertama Anda' : 'Belum ada proposal masuk'}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>No. Proposal</th><th>Klien</th><th>Kampanye</th>
                  {user?.role !== 'sales' && <th>Sales</th>}
                  <th>Total</th><th>Status</th><th>Update</th><th>Aksi</th>
                </tr></thead>
                <tbody>
                  {proposals.map(p => (
                    <tr key={p.id}>
                      <td><span className="mono" style={{ fontSize: 11.5, fontWeight: 700 }}>{p.proposal_number}</span></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.client_name}</div>
                        {p.client_company && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{p.client_company}</div>}
                      </td>
                      <td>{p.campaign_name}</td>
                      {user?.role !== 'sales' && <td>{p.sales_name}</td>}
                      <td><span style={{ fontWeight: 700 }}>{IDR(p.total_amount)}</span></td>
                      <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                      <td style={{ fontSize: 11.5, color: 'var(--text2)' }}>{fmtDT(p.updated_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => onNav(`detail:${p.id}`)}>👁️ Detail</button>
                          {user?.role === 'sales' && p.status === 'rejected' && (
                            <button className="btn btn-primary btn-sm" onClick={() => onNav(`detail:${p.id}`)}>✏️ Revisi</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
