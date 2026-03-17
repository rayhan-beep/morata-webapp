import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('morata_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if ([401, 403].includes(err.response?.status)) {
    localStorage.clear();
    window.location.href = '/';
  }
  return Promise.reject(err);
});

export default api;

export const IDR = (n) => {
  if (!n && n !== 0) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
};

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
export const fmtDT = (d) => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export const STATUS_LABEL = { draft: 'Draft', waiting_approval: 'Menunggu Approval', approved: 'Disetujui', rejected: 'Ditolak', published: 'Published' };
export const STATUS_BADGE = { draft: 'badge-draft', waiting_approval: 'badge-waiting', approved: 'badge-approved', rejected: 'badge-rejected', published: 'badge-published' };

export const parseSpecs = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

export const SPEC_LABELS = {
  ukuran: 'Ukuran', format: 'Format', penerangan: 'Penerangan', traffic_per_day: 'Traffic/Day',
  durasi: 'Durasi', slot: 'Slot', spot_per_day: 'Spot/Day', jam_operasional: 'Jam Operasional',
};
