/* eslint-disable */
// Chạy riêng migration 006 + seed atvsld mẫu (không reset gì khác).
//   node sql/run_006.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, '006_atvsld_reports.sql'), 'utf8');
    await c.query(sql);
    console.log('✓ created table atvsld_reports');

    const biz = await c.query(
      `SELECT b.id FROM businesses b JOIN accounts a ON a.id = b.account_id WHERE a.username = 'doanhnghiep' LIMIT 1`,
    );
    if (biz.rowCount === 0) {
      console.log('  (không thấy business demo, bỏ qua seed mẫu)');
      return;
    }
    const businessId = biz.rows[0].id;
    const existing = await c.query('SELECT count(*)::int AS n FROM atvsld_reports WHERE enterprise_id = $1', [businessId]);
    if (existing.rows[0].n > 0) {
      console.log('  atvsld_reports mẫu đã có, bỏ qua');
      return;
    }
    const declaration = JSON.stringify({
      tongLaoDong: '179', nguoiATVSLD: '0', nguoiYTe: '0', laoDongNu: '0',
      tnldTongVu: '0', bnnChiPhi: '10.2', skLoai2: '4', skLoai3: '6',
      hlNhom1: '10/10', hlNhom2: '6/12', hlTongChiPhi: '10.2',
      mayTongSo: '4', qtTongMau: '60', qtKhongDat: '20', thoiDiemDanhGia: '04/2022',
    });
    const rows = [
      ['Cả năm', 2022, '15/12/2022', '', '', '', 'Nhập liệu', null],
      ['6 tháng', 2022, '01/07/2022', '', '02/07/2022', '02/07/2022', 'Chờ tiếp nhận', null],
      ['Cả năm', 2021, '15/12/2021', '', '28/12/2021', '28/12/2021', 'Từ chối', 'Kiểm tra lại dữ liệu'],
    ];
    for (const [ky, nam, batDau, ketThuc, nop, capNhat, status, lyDo] of rows) {
      await c.query(
        `INSERT INTO atvsld_reports
           (enterprise_id, ten, mst, nam, ky, ngay_bat_dau, ngay_ket_thuc, ngay_nop,
            nguoi_chinh_sua, province, ward, status, ly_do_tu_choi, declaration, submitted_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16)`,
        [
          businessId, 'CÔNG TY TNHH DEMO VNA', 'DN-DEMO-0001', nam, ky, batDau, ketThuc, nop,
          'Phan Thanh Tùng', 'Thành phố Hồ Chí Minh', 'Phường Bình Thọ', status, lyDo,
          declaration, nop ? new Date() : null, new Date(),
        ],
      );
    }
    console.log('✓ thêm 3 atvsld_reports mẫu');
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
