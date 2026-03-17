# Morata OOH Proposal System v2

## Setup (Pertama Kali)

### Backend
```powershell
cd morata-v2\backend
npm install
npm run seed
```

### Frontend
```powershell
cd morata-v2\frontend
npm install --legacy-peer-deps
```

---

## Cara Jalankan (Setiap Kali)

**Terminal 1 — Backend:**
```powershell
cd morata-v2\backend
npm run dev
```

**Terminal 2 — Frontend:**
```powershell
cd morata-v2\frontend
$env:PORT=3001; npm start
```

Buka: **http://localhost:3001**

---

## Login Demo

| Role    | Email              | Password   |
|---------|--------------------|------------|
| Admin   | admin@morata.id    | admin123   |
| Sales   | budi@morata.id     | sales123   |
| Manager | reza@morata.id     | manager123 |

---

## Tipe Aset & Spesifikasi

| Tipe      | Spesifikasi                                                        |
|-----------|--------------------------------------------------------------------|
| Billboard | Ukuran, Format, Penerangan, Traffic/Day                            |
| LED       | Ukuran, Format, Penerangan, Traffic/Day + Durasi, Slot, Spot/Day, Jam Operasional |
| Static    | Ukuran, Format, Penerangan, Traffic/Day                            |

Semua tipe memiliki: **Kode Media**, **Alamat Media**, Kota, Kawasan, Rate Card (opsional), Net, Super Net.

---

## Harga di Proposal

- **Rate Card** — hanya muncul jika aset punya rate card > 0
- **Net** — selalu tersedia
- **Super Net** — selalu tersedia  
- **Custom** — sales input manual, sistem tampilkan selisih % dan nominal untuk manager
