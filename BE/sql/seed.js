/* eslint-disable */
// One-shot idempotent seeder.
//   1. Tạo các bảng resource mới (001_new_resources.sql)
//   2. Seed permissions / roles / report_configs / categories (002_seed.sql)
//   3. Reset tài khoản Sở:  admin / 123456
//   4. Tạo tài khoản Doanh nghiệp:  0300000001 (MST) / 12345678  (+ business liên kết)
//   5. Thêm vài accident_reports mẫu cho business demo
//
// Chạy:  node sql/seed.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { seedDiverse } = require('./008_diverse_seed');
require('dotenv').config();

const URL = process.env.DATABASE_URL;
const SO_USERNAME = 'admin';
const SO_PASSWORD = '12345678';
// Username DN = MST (đúng quy ước đăng ký: business.service tạo account username = taxCode).
const DN_USERNAME = '0300000001';
const DN_PASSWORD = '12345678';

async function runSqlFile(c, file) {
  const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
  await c.query(sql);
  console.log(`✓ executed ${file}`);
}

async function seedSoAdmin(c) {
  const hash = await bcrypt.hash(SO_PASSWORD, 10);
  const existing = await c.query('SELECT id FROM users WHERE username = $1', [SO_USERNAME]);
  if (existing.rowCount > 0) {
    await c.query(
      `UPDATE users SET password = $1, role = 'ADMIN', is_active = true WHERE username = $2`,
      [hash, SO_USERNAME],
    );
    console.log(`✓ reset tài khoản Sở: ${SO_USERNAME} / ${SO_PASSWORD} (role ADMIN)`);
    return;
  }
  await c.query(
    `INSERT INTO users (username, password, email, full_name, role, is_active)
     VALUES ($1, $2, $3, $4, 'ADMIN', true)`,
    [SO_USERNAME, hash, 'admin@vna.local', 'Quản trị viên Sở'],
  );
  console.log(`✓ tạo tài khoản Sở: ${SO_USERNAME} / ${SO_PASSWORD} (role ADMIN)`);
}

async function seedDnAccount(c) {
  const existing = await c.query('SELECT id FROM accounts WHERE username = $1', [DN_USERNAME]);
  let accountId;
  const hash = await bcrypt.hash(DN_PASSWORD, 10);

  if (existing.rowCount > 0) {
    accountId = existing.rows[0].id;
    await c.query('UPDATE accounts SET password = $1 WHERE id = $2', [hash, accountId]);
    console.log(`✓ reset mật khẩu tài khoản DN: ${DN_USERNAME} / ${DN_PASSWORD}`);
  } else {
    const ins = await c.query(
      `INSERT INTO accounts (username, password, role) VALUES ($1, $2, 'DoanhNghiep') RETURNING id`,
      [DN_USERNAME, hash],
    );
    accountId = ins.rows[0].id;
    console.log(`✓ tạo tài khoản DN: ${DN_USERNAME} / ${DN_PASSWORD}`);
  }

  // Business liên kết — chỉ tạo nếu account chưa gắn business nào
  const linked = await c.query('SELECT id FROM businesses WHERE account_id = $1', [accountId]);
  if (linked.rowCount > 0) {
    console.log('  business demo đã tồn tại, bỏ qua');
    return { businessId: linked.rows[0].id };
  }

  const etype = await c.query('SELECT ten FROM enterprise_types ORDER BY id LIMIT 1');
  const sector = await c.query('SELECT ten FROM business_sectors WHERE cap = 4 ORDER BY id LIMIT 1');
  const businessType = etype.rows[0]?.ten ?? 'Công ty trách nhiệm hữu hạn';
  const mainIndustry = sector.rows[0]?.ten ?? 'Hoạt động dịch vụ';

  const biz = await c.query(
    `INSERT INTO businesses
       (business_name, tax_code, business_type, main_industry,
        registered_province, registered_ward, email, is_active, account_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)
     RETURNING id`,
    [
      'CÔNG TY TNHH DEMO VNA',
      '0300000001',
      businessType,
      mainIndustry,
      'Thành phố Hồ Chí Minh',
      'Phường Bình Thọ',
      'doanhnghiep.demo@vna.local',
      accountId,
    ],
  );
  console.log('✓ tạo business demo liên kết tài khoản DN');
  return { businessId: biz.rows[0].id };
}

async function seedSampleAtvsldReports(c, businessId) {
  if (!businessId) return;
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
        businessId, 'CÔNG TY TNHH DEMO VNA', '0300000001', nam, ky, batDau, ketThuc, nop,
        'Phan Thanh Tùng', 'Thành phố Hồ Chí Minh', 'Phường Bình Thọ', status, lyDo,
        declaration, nop ? new Date() : null, capNhat ? new Date() : new Date(),
      ],
    );
  }
  console.log('✓ thêm 3 atvsld_reports mẫu (Nhập liệu / Chờ tiếp nhận / Từ chối)');
}

async function seedSampleReports(c, businessId) {
  if (!businessId) return;
  const existing = await c.query('SELECT count(*)::int AS n FROM accident_reports WHERE enterprise_id = $1', [businessId]);
  if (existing.rows[0].n > 0) {
    console.log('  accident_reports mẫu đã có, bỏ qua');
    return;
  }
  const cfg = await c.query('SELECT id, ky FROM report_configs ORDER BY id LIMIT 1');
  if (cfg.rowCount === 0) return;
  const configId = cfg.rows[0].id;
  const ky = cfg.rows[0].ky;
  const vals = [2, 1, 1, 10, 5, 5, 5, 20, 6000000, 2000000, 2000000, 2000000, 20000000];
  const phanLoaiRows = {};
  for (let m = 1; m <= 24; m++) {
    phanLoaiRows[String(m)] = Array(13).fill(0);
  }
  phanLoaiRows['2'] = vals;
  phanLoaiRows['16'] = vals;
  phanLoaiRows['24'] = vals;
  const phanLoaiJson = JSON.stringify(phanLoaiRows);

  await c.query(
    `INSERT INTO accident_reports
       (enterprise_id, config_id, ten, mst, ky, status, rows, chi_tiet_rows, phan_loai_rows,
        province, ward, loai_hinh, so_lao_dong, so_ld_co_bao_hiem, so_vu,
        so_vu_co_nguoi_chet, so_vu_co_2_nguoi_bi_nan, so_nguoi_bi_nan, so_ld_nu,
        so_nguoi_bi_chet, so_nguoi_bi_thuong_nang, so_ngay_nghi, tong_so_tien,
        chi_phi_y_te, chi_phi_tra_luong, boi_thuong_tro_cap, thiet_hai_tai_san, submitted_at)
     VALUES ($1,$2,$3,$4,$5,'Đã nộp',$6::jsonb,'[]'::jsonb,$7::jsonb,
        'Thành phố Hồ Chí Minh','Phường Bình Thọ','Công ty trách nhiệm hữu hạn',
        50,45,2,1,1,10,5,5,5,20,6000000,2000000,2000000,2000000,20000000, now())`,
    [businessId, configId, 'CÔNG TY TNHH DEMO VNA', '0300000001', ky, phanLoaiJson, phanLoaiJson],
  );
  console.log('✓ thêm 1 accident_report mẫu (trạng thái Đã nộp)');
}

(async () => {
  const c = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await runSqlFile(c, '001_new_resources.sql');
    await runSqlFile(c, '002_seed.sql');
    await runSqlFile(c, '003_user_role_link.sql');
    await seedSoAdmin(c);
    await runSqlFile(c, '004_sync_user_roles.sql');
    await runSqlFile(c, '005_accident_phan_loai.sql');
    await runSqlFile(c, '006_atvsld_reports.sql');
    await runSqlFile(c, '007_role_protection.sql');
    await runSqlFile(c, '009_password_changed_at.sql');
    const { businessId } = await seedDnAccount(c);
    await seedSampleReports(c, businessId);
    await seedSampleAtvsldReports(c, businessId);
    await seedDiverse(c);
    console.log('\n=== HOÀN TẤT SEED ===');
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
