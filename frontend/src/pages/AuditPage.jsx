import { useState, useEffect } from 'react';
import api, { fmtDT } from '../utils/api';

const ACTION_COLOR = (a) => {
  if (a.includes('APPROVE')) return 'var(--success)';
  if (a.includes('REJECT')) return 'var(--danger)';
  if (a.includes('SUBMIT')) return 'var(--info)';
  if (a.includes('CREATE')) return 'var(--primary)';
  if (a.includes('DELETE') || a.includes('DEACTIVATE')) return 'var(--danger)';
  return 'var(--text2)';
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/audit').then(r => setLogs(r.data)).finally(() => setLoading(false)); }, []);

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>📜 Audit Trail</div>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{logs.length} aktivitas</span>
      </div>
      {loading ? <div className="loading"><div className="spinner" /></div>
        : logs.length === 0 ? <div className="empty"><div className="empty-icon">📜</div><h3>Belum ada log</h3></div>
        : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Tipe</th><th>Detail</th></tr></thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 11.5, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmtDT(log.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{log.user_name}</td>
                    <td>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: ACTION_COLOR(log.action), textTransform: 'uppercase', letterSpacing: .3 }}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td><span className="badge badge-draft" style={{ fontSize: 10 }}>{log.entity_type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
