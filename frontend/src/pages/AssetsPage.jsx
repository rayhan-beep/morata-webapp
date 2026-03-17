import { useState, useEffect } from 'react';
import api, { IDR, parseSpecs, SPEC_LABELS } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AssetForm from '../components/admin/AssetForm';

const ICONS = { Billboard: '🪧', LED: '📺', Static: '🏗️' };
const TYPES = ['Billboard', 'LED', 'Static'];

export default function AssetsPage({ onSelect }) {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [cities, setCities] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [viewAsset, setViewAsset] = useState(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (city) p.set('city', city);
    if (type) p.set('type', type);
    api.get(`/assets?${p}`).then(r => setAssets(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { api.get('/assets/meta/cities').then(r => setCities(r.data)); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, city, type]);

  const deactivate = async (id) => {
    if (!window.confirm('Nonaktifkan aset ini?')) return;
    await api.delete(`/assets/${id}`);
    load();
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input placeholder="Kode media, alamat, kota..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={city} onChange={e => setCity(e.target.value)}>
          <option value="">Semua Kota</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-control" style={{ width: 'auto' }} value={type} onChange={e => setType(e.target.value)}>
          <option value="">Semua Tipe</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => { setEditAsset(null); setShowForm(true); }}>+ Tambah Aset</button>
        )}
      </div>

      <div style={{ marginBottom: 14, fontSize: 12.5, color: 'var(--text2)' }}>
        {loading ? 'Memuat...' : `${assets.length} aset ditemukan`}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div>
        : assets.length === 0 ? (
          <div className="empty"><div className="empty-icon">🗺️</div><h3>Tidak ada aset ditemukan</h3><p>Coba ubah filter pencarian</p></div>
        ) : (
          <div className="asset-grid">
            {assets.map(asset => {
              const specs = parseSpecs(asset.specs);
              return (
                <div key={asset.id} className={`asset-card ${onSelect ? '' : ''}`}
                  onClick={() => onSelect ? onSelect(asset) : setViewAsset(asset)}>
                  <div className="asset-img">
                    {asset.photo_url ? <img src={asset.photo_url} alt={asset.name} /> : <span>{ICONS[asset.type] || '🪧'}</span>}
                    <span className="badge badge-draft" style={{ position: 'absolute', top: 8, right: 8, fontSize: 10 }}>{asset.type}</span>
                  </div>
                  <div className="asset-body">
                    <div className="asset-code">{asset.media_code || '—'}</div>
                    <div className="asset-name">{asset.name}</div>
                    <div className="asset-loc">📍 {[asset.location, asset.city].filter(Boolean).join(', ')}</div>
                    <div className="asset-specs-row">
                      {specs.ukuran && <span>📐 {specs.ukuran}</span>}
                      {specs.penerangan && <span>💡 {specs.penerangan}</span>}
                      {specs.traffic_per_day && <span>🚗 {specs.traffic_per_day}/day</span>}
                      {specs.durasi && <span>⏱ {specs.durasi}</span>}
                    </div>
                    <div className="price-grid">
                      <div className="price-cell">
                        <span className="price-lbl">Rate Card</span>
                        <span className="price-val">{asset.rate_card > 0 ? IDR(asset.rate_card) : '—'}</span>
                      </div>
                      <div className="price-cell">
                        <span className="price-lbl">Net</span>
                        <span className="price-val">{IDR(asset.net_price)}</span>
                      </div>
                      <div className="price-cell" style={{ background: 'var(--primary-light)' }}>
                        <span className="price-lbl" style={{ color: 'var(--primary)' }}>Super Net</span>
                        <span className="price-val" style={{ color: 'var(--primary)' }}>{IDR(asset.super_net_price)}</span>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setEditAsset(asset); setShowForm(true); }}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deactivate(asset.id)}>🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Detail modal */}
      {viewAsset && !onSelect && (() => {
        const specs = parseSpecs(viewAsset.specs);
        return (
          <div className="overlay" onClick={() => setViewAsset(null)}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: .5 }}>{viewAsset.media_code}</div>
                  <div className="modal-title">{viewAsset.name}</div>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setViewAsset(null)}>✕</button>
              </div>
              {viewAsset.photo_url && <img src={viewAsset.photo_url} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 'var(--radius)', marginBottom: 18 }} />}
              <div className="grid2" style={{ marginBottom: 14 }}>
                <div><div className="form-label">Tipe</div><p>{viewAsset.type}</p></div>
                <div><div className="form-label">Kota</div><p>{viewAsset.city}</p></div>
                {viewAsset.location && <div className="col2"><div className="form-label">Lokasi</div><p>{viewAsset.location}</p></div>}
              </div>
              {Object.keys(specs).length > 0 && <>
                <div className="divider" />
                <div style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>Spesifikasi</div>
                <div className="grid2">
                  {Object.entries(specs).map(([k, v]) => (
                    <div key={k}><div className="form-label">{SPEC_LABELS[k] || k}</div><p>{v}</p></div>
                  ))}
                </div>
              </>}
              <div className="divider" />
              <div className="price-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="price-cell"><span className="price-lbl">Rate Card</span><span className="price-val">{viewAsset.rate_card > 0 ? IDR(viewAsset.rate_card) : '—'}</span></div>
                <div className="price-cell"><span className="price-lbl">Net</span><span className="price-val">{IDR(viewAsset.net_price)}</span></div>
                <div className="price-cell" style={{ background: 'var(--primary-light)' }}>
                  <span className="price-lbl" style={{ color: 'var(--primary)' }}>Super Net</span>
                  <span className="price-val" style={{ color: 'var(--primary)' }}>{IDR(viewAsset.super_net_price)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showForm && <AssetForm asset={editAsset} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}
