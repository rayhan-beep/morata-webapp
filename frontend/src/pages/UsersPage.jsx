import { useState, useEffect } from 'react';
import api, { fmtDT } from '../utils/api';

const ROLE_BADGE = { admin: 'badge-published', sales: 'badge-approved', manager: 'badge-waiting' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const load = () => { setLoading(true); api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!window.confirm('Hapus pengguna ini?')) return;
    await api.delete(`/users/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowForm(true); }}>+ Tambah Pengguna</button>
      </div>

      <div className="card">
        <div className="card-title">Manajemen Pengguna</div>
        {loading ? <div className="loading"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Bergabung</th><th>Aksi</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{u.email}</td>
                    <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDT(u.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditUser(u); setShowForm(true); }}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(u.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <UserForm user={editUser} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function UserForm({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', role: user?.role || 'sales', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && !f.password) { setError('Password wajib diisi'); return; }
    setLoading(true);
    try {
      const data = { name: f.name, email: f.email, role: f.role };
      if (f.password) data.password = f.password;
      if (isEdit) await api.put(`/users/${user.id}`, data);
      else await api.post('/users', { ...data, password: f.password });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Nama Lengkap *</label><input className="form-control" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required /></div>
          <div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-control" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} required /></div>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select className="form-control" value={f.role} onChange={e => setF(p => ({ ...p, role: e.target.value }))}>
              <option value="sales">Sales</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">{isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</label><input type="password" className="form-control" value={f.password} onChange={e => setF(p => ({ ...p, password: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : (isEdit ? '💾 Simpan' : '+ Tambah')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
