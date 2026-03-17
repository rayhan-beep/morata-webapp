import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/common/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AssetsPage from './pages/AssetsPage';
import ProposalsPage from './pages/ProposalsPage';
import ProposalDetail from './pages/ProposalDetail';
import CreateProposal from './pages/CreateProposal';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';

const TITLES = {
  dashboard: 'Dashboard', assets: 'Aset OOH', proposals: 'Proposal',
  pending: 'Menunggu Review', create: 'Buat Proposal', users: 'Pengguna', audit: 'Audit Trail',
};

function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!user) return <LoginPage />;

  const [pageName, pageParam] = page.split(':');

  const title = pageName === 'detail' ? 'Detail Proposal' : TITLES[pageName] || pageName;

  const renderPage = () => {
    switch (pageName) {
      case 'dashboard': return <Dashboard onNav={setPage} />;
      case 'assets': return <AssetsPage />;
      case 'proposals': return <ProposalsPage onNav={setPage} />;
      case 'pending': return <ProposalsPage onNav={setPage} filterStatus="waiting_approval" />;
      case 'create': return <CreateProposal onNav={setPage} />;
      case 'detail': return <ProposalDetail id={pageParam} onNav={setPage} />;
      case 'users': return user.role === 'admin' ? <UsersPage /> : <div className="alert alert-error">Akses ditolak</div>;
      case 'audit': return <AuditPage />;
      default: return <Dashboard onNav={setPage} />;
    }
  };

  return (
    <div className="layout">
      <Sidebar page={pageName} onNav={setPage} />
      <main className="main">
        <div className="topbar">
          <div className="page-title">{title}</div>
          {user.role === 'manager' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('pending')}>⏳ Review Queue</button>
          )}
        </div>
        <div className="content">{renderPage()}</div>
      </main>
    </div>
  );
}

export default function Root() {
  return <AuthProvider><App /></AuthProvider>;
}
