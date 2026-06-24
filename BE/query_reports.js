const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const res = await client.query("SELECT ten, mst, loai_hinh, so_lao_dong, so_ld_co_bao_hiem, so_nguoi_bi_nan, so_nguoi_bi_chet, so_nguoi_bi_thuong_nang, so_vu FROM accident_reports WHERE loai_hinh = 'Doanh nghiệp tư nhân' AND nam = '2024'");
  console.log('--- ACCIDENT REPORTS FOR DOANH NGHIEP TU NHAN (2024) ---');
  console.log(JSON.stringify(res.rows, null, 2));
  
  // Calculate sums
  const reps = res.rows;
  const sum = (key) => reps.reduce((acc, r) => acc + (r[key] !== null ? Number(r[key]) : 0), 0);
  console.log('SUMS:');
  console.log({
    coSoTongSo: reps.length,
    coSoThamGia: reps.filter(r => Number(r.so_vu) > 0).length,
    soLaoDong: sum('so_lao_dong'),
    soLDCoBaoHiem: sum('so_ld_co_bao_hiem'),
    soNguoiBiNan: sum('so_nguoi_bi_nan'),
    soNguoiBiChet: sum('so_nguoi_bi_chet'),
    soNguoiBiThuongNang: sum('so_nguoi_bi_thuong_nang'),
  });

  await client.end();
}

run().catch(console.error);
