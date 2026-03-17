import { useState } from 'react';
import api, { parseSpecs, SPEC_LABELS } from '../../utils/api';

const TYPES = ['Billboard', 'LED', 'Static'];
const SHARED = ['ukuran', 'format', 'penerangan', 'traffic_per_day'];
const LED_EXTRA = ['durasi', 'slot', 'spot_per_day', 'jam_operasional'];
const HINTS = {
  ukuran: 'mis. 10x20m', format: 'mis. Horizontal', penerangan: 'mis. Backlit',
  traffic_per_day: 'mis. 50.000', durasi: 'mis. 15 detik', slot: 'mis. 4 slot/menit',
  spot_per_day: 'mis. 240', jam_operasional: 'mis. 06.00–24.00',
};

export default function AssetForm({ asset, onClose, onSaved }) {
  const isEdit = !!asset;
  const existSpecs = parseSpecs(asset?.specs);

  const [f, setF] = useState({
    media_code: asset?.media_code || '',
    name: asset?.name || '',
    type: asset?.type || 'Billboard',
    city: asset?.city || '',
    location: asset?.location || '',
    rate_card: asset?.rate_card || '',
    net_price: asset?.net_price || '',
    super_net_price: asset?.super_net_price || '',
    status: asset?.status || 'active',
    ...Object.fromEntries([...SHARED, ...LED_EXTRA].map(k => [k, existSpecs[k] || ''])),
  });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const isLED = f.type === 'LED';

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const specs = {};
      SHARED.forEach(k => { if (f[k]) specs[k] = f[k]; });
      if (isLED) LED_EXTRA.forEach(k => { if (f[k]) specs[k] = f[k]; });

      const fd = new FormData();
      fd.append('media_code', f.media_code);
      fd.append('name', f.name);
      fd.append('type', f.type);
      fd.append('city', f.city);
      fd.append('location', f.location);
      fd.append('rate_card', f.rate_card || 0);
      fd.append('net_price', f.net_price);
      fd.append('super_net_price', f.super_net_price);
      fd.append('status', f.status);
      fd.append('specs', JSON.stringify(specs));
      if (photo) fd.append('photo', photo);

      const headers = { 'Content-Type': 'multipart/form-data' };
      if (isEdit) await api.put(`/assets/${asset.id}`, fd, { headers });
      else await api.post('/assets', fd, { headers });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setLoading(false); }
  };

  const Section = ({ label, color }) => (
    <div className="col2" style={{ fontWeight: 700, fontSize: 10.5, color: color || 'var(--text2)', textTransform: 'uppercase', letterSpacing: .8, marginTop: 4, marginBottom: -4 }}>{label}</div>
  );

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Aset' : 'Tambah Aset Baru'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        <form onSubmit={submit}>
          <div className="grid2">
            <Section label="Identitas Aset" />

            <div className="form-group">
              <label className="form-label">Kode Media</label>
              <input className="form-control" placeholder="mis. BBD-JKT-001" value={f.media_code} onChange={e => set('media_code', e.target.value)} />
              <div className="form-hint">Kode unik untuk pencarian cepat</div>
            </div>
            <div className="form-group">
              <label className="form-label">Tipe *</label>
              <select className="form-control" value={f.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group col2">
              <label className="form-label">Alamat Media *</label>
              <input className="form-control" placeholder="mis. Jl. Sudirman No.1, depan Wisma 46" value={f.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Kota *</label>
              <input className="form-control" value={f.city} onChange={e => set('city', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Kawasan / Area</label>
              <input className="form-control" placeholder="mis. Sudirman, SCBD" value={f.location} onChange={e => set('location', e.target.value)} />
            </div>

            <div className="col2"><div className="divider" style={{ margin: '4px 0' }} /></div>
            <Section label={`Spesifikasi ${f.type}`} />

            {SHARED.map(k => (
              <div className="form-group" key={k}>
                <label className="form-label">{SPEC_LABELS[k]}</label>
                <input className="form-control" placeholder={HINTS[k]} value={f[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}

            {isLED && <>
              <Section label="Spesifikasi Tambahan LED" color="var(--primary)" />
              {LED_EXTRA.map(k => (
                <div className="form-group" key={k}>
                  <label className="form-label">{SPEC_LABELS[k]}</label>
                  <input className="form-control" placeholder={HINTS[k]} value={f[k]} onChange={e => set(k, e.target.value)} />
                </div>
              ))}
            </>}

            <div className="col2"><div className="divider" style={{ margin: '4px 0' }} /></div>
            <Section label="Harga" />

            <div className="form-group">
              <label className="form-label">Rate Card (IDR)</label>
              <input className="form-control" type="number" min="0" placeholder="Opsional" value={f.rate_card} onChange={e => set('rate_card', e.target.value)} />
              <div className="form-hint">Opsional</div>
            </div>
            <div className="form-group">
              <label className="form-label">Net (IDR) *</label>
              <input className="form-control" type="number" min="0" value={f.net_price} onChange={e => set('net_price', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Super Net (IDR) *</label>
              <input className="form-control" type="number" min="0" value={f.super_net_price} onChange={e => set('super_net_price', e.target.value)} required />
            </div>

            {isEdit && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={f.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                </select>
              </div>
            )}

            <div className="col2"><div className="divider" style={{ margin: '4px 0' }} /></div>
            <div className="form-group col2">
              <label className="form-label">Foto Aset</label>
              <input type="file" accept="image/*" className="form-control" onChange={e => setPhoto(e.target.files[0])} />
              <div className="form-hint">JPG / PNG, maks 10MB</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Menyimpan...</> : (isEdit ? '💾 Simpan' : '+ Tambah')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
