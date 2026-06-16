/* eslint-disable */
// Sửa toàn diện mã số thuế về đúng 10 chữ số cho mọi DN còn sai chuẩn,
// đồng thời cập nhật cột mst trong accident_reports / atvsld_reports theo enterprise_id.
// Idempotent: chỉ động vào DN có tax_code KHÔNG khớp ^[0-9]{10}$.
//   node sql/fix_mst.js
const { Client } = require('pg');
require('dotenv').config();

// Mapping cố định cho các DN gốc (demo + bulk) sang MST 10 số (không trùng dải seed 03800002xx).
const MAP = {
  'DN-DEMO-0001': '0300000001',
  'DN-1001': '0310000001',
  'DN-1002': '0310000002',
  'DN-1003': '0310000003',
  'DN-1004': '0310000004',
  'DN-1005': '0310000005',
  'DN-1006': '0310000006',
  'DN-1007': '0310000007',
  'DN-1008': '0310000008',
  'DN-1009': '0310000009',
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const bad = await c.query("SELECT id, tax_code FROM businesses WHERE tax_code !~ '^[0-9]{10}$' ORDER BY tax_code");
    if (bad.rowCount === 0) {
      console.log('✓ Không còn MST sai chuẩn — bỏ qua.');
      return;
    }
    let used = new Set((await c.query("SELECT tax_code FROM businesses")).rows.map((r) => r.tax_code));
    let fallback = 320000001; // dải dự phòng cho DN lạ không có trong MAP
    for (const row of bad.rows) {
      let next = MAP[row.tax_code];
      if (!next || used.has(next)) {
        // sinh mã 10 số dự phòng chưa dùng
        do { next = String(fallback++).padStart(10, '0'); } while (used.has(next));
      }
      used.add(next);
      // cập nhật reports trước (mst lưu theo tax_code), rồi business
      await c.query('UPDATE accident_reports SET mst=$1 WHERE enterprise_id=$2', [next, row.id]);
      await c.query('UPDATE atvsld_reports  SET mst=$1 WHERE enterprise_id=$2', [next, row.id]);
      await c.query('UPDATE businesses SET tax_code=$1 WHERE id=$2', [next, row.id]);
      console.log(`  ${row.tax_code} -> ${next}`);
    }
    console.log(`✓ Đã sửa ${bad.rowCount} MST sai chuẩn (kèm cập nhật mst trong reports).`);

    const left = await c.query("SELECT count(*)::int n FROM businesses WHERE tax_code !~ '^[0-9]{10}$'");
    console.log('Còn MST sai chuẩn:', left.rows[0].n);
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
