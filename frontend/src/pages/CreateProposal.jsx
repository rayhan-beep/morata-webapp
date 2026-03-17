import { useState } from 'react';
import api, { IDR, parseSpecs } from '../utils/api';
import AssetsPage from './AssetsPage';

const STEPS = ['Pilih Aset', 'Atur Harga & Tanggal', 'Info Klien', 'Selesai'];

export default function CreateProposal({ onNav }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState([]);
  const [items, setItems] = useState([]);
  const [client, setClient] = useState({ client_name: '', client_company: '', client_email: '', client_phone: '', campaign_name: '' });
  const [avail, setAvail] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleAsset = (asset) => {
    setSelected(prev =>
      prev.find(a => a.id === asset.id) ? prev.filter(a => a.id !== asset.id) : [...prev, asset]
    );
  };

  const toStep1 = () => {
    if (!selected.length) { setError('Pilih minimal 1 aset'); return; }
    setError('');
    setItems(selected.map(a => ({
      asset_id: a.id, asset: a,
      start_date: '', end_date: '',
      price_type: 'net',
      standard_price: a.net_price,
      proposed_price: a.net_price,
      is_custom: false, notes: '',
    })));
    setStep(1);
  };

  const updateItem = (idx, key, val) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      if (key === 'price_type') {
        const a = next[idx].asset;
        const map = { rate_card: a.rate_card, net: a.net_price, super_net: a.super_net_price };
        if (val !== 'custom') {
          next[idx].standard_price = map[val];
          next[idx].proposed_price = map[val];
          next[idx].is_custom = false;
        } else {
          next[idx].standard_price = a.net_price;
          next[idx].is_custom = true;
        }
      }
      return next;
    });
  };

  const checkAvail = async (idx) => {
    const item = items[idx];
    if (!item.start_date || !item.end_date) return;
    try {
      const r = await api.post(`/assets/${item.asset_id}/check-availability`, { start_date: item.start_date, end_date: item.end_date });
      setAvail(p => ({ ...p, [idx]: r.data.available }));
    } catch { setAvail(p => ({ ...p, [idx]: false })); }
  };

  const toStep2 = () => {
    for (const item of items) {
      if (!item.start_date || !item.end_date) { setError('Lengkapi semua tanggal tayang'); return; }
      if (new Date(item.end_date) < new Date(item.start_date)) { setError('Tanggal selesai harus setelah tanggal mulai'); return; }
      if (!item.proposed_price || item.proposed_price <= 0) { setError('Harga tidak boleh 0'); return; }
    }
    if (Object.values(avail).some(v => v === false)) { setError('Ada aset yang tidak tersedia pada periode tersebut'); return; }
    setError('');
    setStep(2);
  };

  const submit = async (isDraft) => {
    if (!client.client_name || !client.campaign_name) { setError('Nama klien dan kampanye wajib diisi'); return; }
    setError(''); setLoading(true);
    try {
      const payload = {
        ...client,
        items: items.map(i => ({
          asset_id: i.asset_id, start_date: i.start_date, end_date: i.end_date,
          price_type: i.price_type, standard_price: i.standard_price,
          proposed_price: parseFloat(i.proposed_price), notes: i.notes,
        })),
      };
      const res = await api.post('/proposals', payload);
      if (!isDraft) await api.post(`/proposals/${res.data.id}/submit`);
      setStep(3);
      setTimeout(() => onNav('proposals'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal membuat proposal');
    } finally { setLoading(false); }
  };

  const total = items.reduce((s, i) => s + (parseFloat(i.proposed_price) || 0), 0);

  return (
    <div>
      {/* Step indicator */}
      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div className={`step ${step === i ? 'active' : step > i ? 'done' : ''}`}>
              <div className="step-num">{step > i ? '✓' : i + 1}</div>
              {s}
            </div>
            {i < STEPS.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* STEP 0 — Select Assets */}
      {step === 0 && (
        <>
          <div className="card" style={{ marginBottom: 16, background: 'var(--primary-light)', border: '1px solid rgba(18,77,226,.15)' }}>
            <div className="flex-between">
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  {selected.length === 0 ? 'Klik kartu aset untuk memilih' : `${selected.length} aset dipilih`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{selected.map(a => a.media_code || a.name).join(', ')}</div>
              </div>
              <button className="btn btn-primary" onClick={toStep1} disabled={!selected.length}>Lanjut →</button>
            </div>
          </div>
          <AssetsPage onSelect={toggleAsset} />
        </>
      )}

      {/* STEP 1 — Pricing & Dates */}
      {step === 1 && (
        <>
          {items.map((item, idx) => {
            const diff = parseFloat(item.proposed_price) - parseFloat(item.standard_price);
            const pct = item.standard_price > 0 ? (diff / item.standard_price * 100).toFixed(1) : 0;
            const specs = parseSpecs(item.asset.specs);
            const availStatus = avail[idx];

            return (
              <div className="card" key={item.asset_id} style={{ marginBottom: 14 }}>
                <div className="flex-between" style={{ marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: .5 }}>{item.asset.media_code}</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{item.asset.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {item.asset.type} · 📍 {[item.asset.location, item.asset.city].filter(Boolean).join(', ')}
                      {specs.ukuran && ` · 📐 ${specs.ukuran}`}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setSelected(selected.filter(a => a.id !== item.asset_id));
                    setItems(items.filter((_, i) => i !== idx));
                    setAvail(a => { const n = { ...a }; delete n[idx]; return n; });
                  }}>✕ Hapus</button>
                </div>

                <div className="grid2" style={{ marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tanggal Mulai *</label>
                    <input type="date" className="form-control" value={item.start_date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => { updateItem(idx, 'start_date', e.target.value); setAvail(a => ({ ...a, [idx]: undefined })); }}
                      onBlur={() => checkAvail(idx)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tanggal Selesai *</label>
                    <input type="date" className="form-control" value={item.end_date}
                      min={item.start_date || new Date().toISOString().split('T')[0]}
                      onChange={e => { updateItem(idx, 'end_date', e.target.value); setAvail(a => ({ ...a, [idx]: undefined })); }}
                      onBlur={() => checkAvail(idx)} />
                  </div>
                </div>

                {item.start_date && item.end_date && (
                  <div className={`alert ${availStatus === true ? 'alert-success' : availStatus === false ? 'alert-error' : 'alert-info'}`} style={{ marginBottom: 12 }}>
                    {availStatus === undefined ? '🔍 Klik di luar kolom tanggal untuk cek ketersediaan...'
                      : availStatus ? '✅ Aset tersedia pada periode ini'
                      : '❌ Aset sudah terboking pada periode ini'}
                  </div>
                )}

                <div className="grid2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tipe Harga *</label>
                    <select className="form-control" value={item.price_type} onChange={e => updateItem(idx, 'price_type', e.target.value)}>
                      {item.asset.rate_card > 0 && <option value="rate_card">Rate Card ({IDR(item.asset.rate_card)})</option>}
                      <option value="net">Net ({IDR(item.asset.net_price)})</option>
                      <option value="super_net">Super Net ({IDR(item.asset.super_net_price)})</option>
                      <option value="custom">Custom (Input Manual)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{item.is_custom ? 'Harga Custom *' : 'Harga Berlaku'}</label>
                    <input type="number" className="form-control" value={item.proposed_price}
                      disabled={!item.is_custom} min="0"
                      onChange={e => updateItem(idx, 'proposed_price', e.target.value)} />
                  </div>
                </div>

                {item.is_custom && parseFloat(item.proposed_price) > 0 && (
                  <div className="alert alert-warning" style={{ marginTop: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 3 }}>📊 Analisis Harga Custom</div>
                      <div style={{ fontSize: 12.5 }}>
                        Standar (Net): <strong>{IDR(item.standard_price)}</strong>
                        {' → '}
                        Diajukan: <strong>{IDR(item.proposed_price)}</strong>
                        {' · '}
                        <span style={{ color: diff > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                          {diff > 0 ? '▲' : '▼'} {Math.abs(pct)}% ({diff >= 0 ? '+' : ''}{IDR(diff)})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0, marginTop: 12 }}>
                  <label className="form-label">Catatan (opsional)</label>
                  <input className="form-control" value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} placeholder="Catatan untuk item ini" />
                </div>
              </div>
            );
          })}

          <div className="card" style={{ background: 'var(--primary-light)', border: '1px solid rgba(18,77,226,.2)', marginBottom: 16 }}>
            <div className="flex-between">
              <div style={{ fontWeight: 700 }}>Total Proposal</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--primary)' }}>{IDR(total)}</div>
            </div>
          </div>

          <div className="flex-between">
            <button className="btn btn-secondary" onClick={() => setStep(0)}>← Kembali</button>
            <button className="btn btn-primary" onClick={toStep2}>Lanjut → Info Klien</button>
          </div>
        </>
      )}

      {/* STEP 2 — Client Info */}
      {step === 2 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Informasi Klien & Kampanye</div>
          <div className="grid2">
            <div className="form-group">
              <label className="form-label">Nama Klien *</label>
              <input className="form-control" value={client.client_name} onChange={e => setClient(p => ({ ...p, client_name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Perusahaan</label>
              <input className="form-control" value={client.client_company} onChange={e => setClient(p => ({ ...p, client_company: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={client.client_email} onChange={e => setClient(p => ({ ...p, client_email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Telepon</label>
              <input className="form-control" value={client.client_phone} onChange={e => setClient(p => ({ ...p, client_phone: e.target.value }))} />
            </div>
            <div className="form-group col2">
              <label className="form-label">Nama Kampanye *</label>
              <input className="form-control" placeholder="mis. Kampanye Lebaran 2025" value={client.campaign_name} onChange={e => setClient(p => ({ ...p, campaign_name: e.target.value }))} required />
            </div>
          </div>
          <div className="flex-between" style={{ marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Kembali</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => submit(true)} disabled={loading}>💾 Simpan Draft</button>
              <button className="btn btn-primary" onClick={() => submit(false)} disabled={loading}>
                {loading ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Mengirim...</> : '📤 Submit Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 — Success */}
      {step === 3 && (
        <div className="card" style={{ textAlign: 'center', padding: '56px 32px' }}>
          <div style={{ fontSize: 60, marginBottom: 18 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Proposal Berhasil Dikirim!</div>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Proposal dikirim ke manager untuk review. Mengalihkan...</p>
          <button className="btn btn-primary" onClick={() => onNav('proposals')}>Lihat Proposal Saya →</button>
        </div>
      )}
    </div>
  );
}
