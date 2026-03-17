const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../models/database');

const specs = {
  billboard: (ukuran, penerangan, traffic) =>
    JSON.stringify({ ukuran, penerangan, traffic_per_day: traffic }),
  led: (ukuran, penerangan, traffic, durasi, slot, spot_per_day, jam_operasional) =>
    JSON.stringify({ ukuran, penerangan, traffic_per_day: traffic, durasi, slot, spot_per_day, jam_operasional }),
  static: (ukuran, penerangan, traffic) =>
    JSON.stringify({ ukuran, penerangan, traffic_per_day: traffic }),
};

async function seed() {
  console.log('Seeding...');

  const adminId = uuidv4();
  const salesId1 = uuidv4();
  const salesId2 = uuidv4();
  const managerId = uuidv4();

  const users = [
    [adminId,    'Admin Morata',  'admin@morata.id',   await bcrypt.hash('admin123', 10),   'admin'],
    [salesId1,   'Budi Santoso',  'budi@morata.id',    await bcrypt.hash('sales123', 10),   'sales'],
    [salesId2,   'Sari Dewi',     'sari@morata.id',    await bcrypt.hash('sales123', 10),   'sales'],
    [managerId,  'Reza Manager',  'reza@morata.id',    await bcrypt.hash('manager123', 10), 'manager'],
  ];

  const uStmt = db.prepare('INSERT OR IGNORE INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)');
  users.forEach(u => uStmt.run(u));
  uStmt.finalize();

  const assets = [
    // Billboard
    ['BBD-JKT-001', 'Jl. Jend. Sudirman No.1, depan Wisma 46', 'Billboard', 'Sudirman', 'Jakarta',
      50000000, 40000000, 35000000, specs.billboard('10x20m', 'Backlit', '50.000')],
    ['BBD-JKT-002', 'Jl. MH Thamrin No.5, samping Grand Indonesia', 'Billboard', 'Thamrin', 'Jakarta',
      35000000, 28000000, 24000000, specs.billboard('8x16m', 'Frontlit', '35.000')],
    ['BBD-BDG-001', 'Jl. Braga No.10, kawasan heritage', 'Billboard', 'Braga', 'Bandung',
      25000000, 20000000, 17000000, specs.billboard('8x18m', 'Backlit', '25.000')],
    ['BBD-YOG-001', 'Jl. Malioboro No.1, depan Pasar Beringharjo', 'Billboard', 'Malioboro', 'Yogyakarta',
      0, 18000000, 15000000, specs.billboard('7x14m', 'Frontlit', '30.000')],
    // LED
    ['LED-JKT-001', 'Bundaran Hotel Indonesia, sisi barat', 'LED', 'Bundaran HI', 'Jakarta',
      80000000, 65000000, 55000000, specs.led('6x12m', 'Full LED', '80.000', '15 detik', '4 slot/menit', '240', '06.00–24.00')],
    ['LED-SBY-001', 'Jl. Basuki Rahmat No.8, depan Tunjungan Plaza', 'LED', 'Basuki Rahmat', 'Surabaya',
      45000000, 36000000, 30000000, specs.led('4x8m', 'Full LED', '45.000', '30 detik', '2 slot/menit', '120', '07.00–23.00')],
    ['LED-SMG-001', 'Lapangan Simpang Lima, sisi utara', 'LED', 'Simpang Lima', 'Semarang',
      40000000, 32000000, 27000000, specs.led('5x10m', 'Full LED', '40.000', '15 detik', '4 slot/menit', '240', '06.00–22.00')],
    // Static
    ['STC-JKT-001', 'Flyover Semanggi, arah Gatot Subroto', 'Static', 'Semanggi', 'Jakarta',
      0, 16000000, 13000000, specs.static('2x30m', 'Non-lit', '20.000')],
    ['STC-BDG-001', 'Jl. Ir. H. Juanda No.50, area kampus ITB', 'Static', 'Dago', 'Bandung',
      10000000, 8000000, 6500000, specs.static('3x5m', 'Backlit', '10.000')],
    ['STC-SBY-001', 'Jembatan Suramadu, sisi Surabaya', 'Static', 'Suramadu', 'Surabaya',
      0, 24000000, 20000000, specs.static('2x50m', 'Non-lit', '30.000')],
  ];

  const aStmt = db.prepare(
    'INSERT OR IGNORE INTO assets (id,media_code,name,type,location,city,rate_card,net_price,super_net_price,specs,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  );
  assets.forEach(a => aStmt.run([uuidv4(), ...a, adminId]));
  aStmt.finalize();

  setTimeout(() => {
    console.log('\n✅ Seed selesai!\n');
    console.log('Login credentials:');
    console.log('  Admin:   admin@morata.id   / admin123');
    console.log('  Sales:   budi@morata.id    / sales123');
    console.log('  Sales:   sari@morata.id    / sales123');
    console.log('  Manager: reza@morata.id    / manager123\n');
    process.exit(0);
  }, 1000);
}

seed();
