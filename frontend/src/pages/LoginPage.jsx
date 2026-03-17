import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(email, password); }
    catch (err) { setError(err.response?.data?.error || 'Login gagal'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={logo} alt="Morata" className="login-logo" />
        <div className="login-tagline">Out-of-Home<br />Advertising<br />Management</div>
        <p className="login-sub">Platform internal untuk manajemen aset OOH,<br />proposal, dan approval harga secara terpusat.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 40, width: '100%', maxWidth: 300 }}>
          {[
            { icon: '🗺️', val: '5000+', lbl: 'Aset OOH' },
            { icon: '📋', val: '3 Role', lbl: 'Akses' },
            { icon: '✅', val: 'Auto', lbl: 'PDF Generate' },
            { icon: '🔒', val: 'Full', lbl: 'Audit Trail' },
          ].map(s => (
            <div key={s.lbl} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, marginBottom: 3 }}>{s.icon}</div>
              <div style={{ fontWeight: 800, color: 'white', fontSize: 16 }}>{s.val}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.38)', marginTop: 1 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-title">Selamat datang 👋</div>
        <p className="login-form-sub">Masuk ke akun Anda untuk melanjutkan.</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" placeholder="email@morata.id" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <input type="password" className="form-control" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Masuk...</> : 'Masuk →'}
          </button>
        </form>

        <div style={{ marginTop: 28, padding: 14, background: 'var(--surface2)', borderRadius: 10, fontSize: 12, color: 'var(--text2)' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>🔑 Demo Akun</div>
          <div>Admin: <code>admin@morata.id</code> / admin123</div>
          <div>Sales: <code>budi@morata.id</code> / sales123</div>
          <div>Manager: <code>reza@morata.id</code> / manager123</div>
        </div>
      </div>
    </div>
  );
}
