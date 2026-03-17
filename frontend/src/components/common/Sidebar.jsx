import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

const NAV = {
  admin: [
    { section: 'Main', items: [{ icon: '📊', label: 'Dashboard', page: 'dashboard' }] },
    { section: 'Manajemen', items: [
      { icon: '🗺️', label: 'Aset OOH', page: 'assets' },
      { icon: '📋', label: 'Semua Proposal', page: 'proposals' },
      { icon: '👥', label: 'Pengguna', page: 'users' },
    ]},
    { section: 'Sistem', items: [{ icon: '📜', label: 'Audit Trail', page: 'audit' }] },
  ],
  sales: [
    { section: 'Main', items: [
      { icon: '📊', label: 'Dashboard', page: 'dashboard' },
      { icon: '🗺️', label: 'Aset OOH', page: 'assets' },
    ]},
    { section: 'Proposal', items: [
      { icon: '📋', label: 'Proposal Saya', page: 'proposals' },
      { icon: '✏️', label: 'Buat Proposal', page: 'create' },
    ]},
  ],
  manager: [
    { section: 'Main', items: [
      { icon: '📊', label: 'Dashboard', page: 'dashboard' },
      { icon: '🗺️', label: 'Aset OOH', page: 'assets' },
    ]},
    { section: 'Review', items: [
      { icon: '⏳', label: 'Perlu Review', page: 'pending' },
      { icon: '📋', label: 'Semua Proposal', page: 'proposals' },
    ]},
    { section: 'Sistem', items: [{ icon: '📜', label: 'Audit Trail', page: 'audit' }] },
  ],
};

export default function Sidebar({ page, onNav }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const nav = NAV[user.role] || [];
  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="Morata" />
      </div>

      <nav className="sidebar-nav">
        {nav.map(section => (
          <div key={section.section}>
            <div className="nav-label">{section.section}</div>
            {section.items.map(item => (
              <button
                key={item.page}
                className={`nav-item ${page === item.page ? 'active' : ''}`}
                onClick={() => onNav(item.page)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-row">
          <div className="avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={logout}
            title="Logout"
            style={{ color: 'rgba(255,255,255,.35)', flexShrink: 0 }}
          >🚪</button>
        </div>
      </div>
    </aside>
  );
}
