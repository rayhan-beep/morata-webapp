import { useState, useEffect } from 'react';
import api, { IDR, fmtDT, STATUS_LABEL, STATUS_BADGE } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ onNav }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/stats'), api.get('/proposals')])
      .then(([s, p]) => { setStats(s.data); setRecent(p.data.slice(0, 6)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /><span>Memuat...</span></div>;

  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';

  return (
    <div>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', borderRadius: 'var(--radius-xl)', padding: '24px 28px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, opacity: .65, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{greet}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{user?.name} 👋</div>
          <div style={{ fontSize: 12.5, opacity: .65, marginTop: 5 }}>
            {user?.role === 'manager' && stats.pending > 0 ? `${stats.pending} proposal menunggu review Anda` : 'Selamat bekerja hari ini!'}
          </div>
        </div>
        <div style={{ textAlign: 'right', position: 'relative' }}>
          <div style={{ fontSize: 10.5, opacity: .55, textTransform: 'uppercase', letterSpacing: 1 }}>Total Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{IDR(stats.revenue || 0)}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>🗺️</div>
          <div><div className="stat-val">{stats.assets || 0}</div><div className="stat-label">Aset Aktif</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>📋</div>
          <div><div className="stat-val">{user?.role === 'sales' ? stats.my_proposals || 0 : stats.total_proposals || 0}</div><div className="stat-label">{user?.role === 'sales' ? 'Proposal Saya' : 'Total Proposal'}</div></div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNav(user?.role === 'sales' ? 'proposals' : 'pending')}>
          <div className="stat-icon" style={{ background: 'var(--warning-bg)' }}>⏳</div>
          <div><div className="stat-val">{stats.pending || 0}</div><div className="stat-label">Menunggu Approval</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)' }}>✅</div>
          <div><div className="stat-val">{stats.approved || 0}</div><div className="stat-label">Disetujui</div></div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
        {user?.role === 'sales' && (
          <div className="card" style={{ cursor: 'pointer', background: 'var(--primary-light)', border: '1px solid rgba(18,77,226,.15)' }} onClick={() => onNav('create')}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✏️</div>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>Buat Proposal Baru</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Pilih aset & ajukan proposal</div>
          </div>
        )}
        {user?.role === 'manager' && (
          <div className="card" style={{ cursor: 'pointer', background: stats.pending > 0 ? 'var(--warning-bg)' : 'var(--surface2)', border: `1px solid ${stats.pending > 0 ? '#fcd34d' : 'var(--border)'}` }} onClick={() => onNav('pending')}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>Review Proposal</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>{stats.pending || 0} proposal menunggu</div>
          </div>
        )}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNav('assets')}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Lihat Aset OOH</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{stats.assets || 0} aset tersedia</div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onNav('proposals')}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>{user?.role === 'sales' ? 'Proposal Saya' : 'Semua Proposal'}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Kelola proposal</div>
        </div>
      </div>

      {/* Recent proposals */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Proposal Terbaru</div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNav('proposals')}>Lihat Semua →</button>
        </div>
        {recent.length === 0 ? (
          <div className="empty"><div className="empty-icon">📋</div><h3>Belum ada proposal</h3></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>No. Proposal</th><th>Klien</th><th>Kampanye</th>
                {user?.role !== 'sales' && <th>Sales</th>}
                <th>Total</th><th>Status</th><th>Dibuat</th>
              </tr></thead>
              <tbody>
                {recent.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onNav(`detail:${p.id}`)}>
                    <td><span className="mono" style={{ fontSize: 11.5, fontWeight: 700 }}>{p.proposal_number}</span></td>
                    <td><div style={{ fontWeight: 600 }}>{p.client_name}</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>{p.client_company}</div></td>
                    <td>{p.campaign_name}</td>
                    {user?.role !== 'sales' && <td>{p.sales_name}</td>}
                    <td><span style={{ fontWeight: 700 }}>{IDR(p.total_amount)}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                    <td style={{ fontSize: 11.5, color: 'var(--text2)' }}>{fmtDT(p.created_at)}</td>
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
