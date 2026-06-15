/* eslint-disable */
// One-shot idempotent seeder.
//   1. Tạo các bảng resource mới (001_new_resources.sql)
//   2. Seed permissions / roles / report_configs / categories (002_seed.sql)
//   3. Reset tài khoản Sở:  admin / 123456
//   4. Tạo tài khoản Doanh nghiệp:  doanhnghiep / 123456  (+ business liên kết)
//   5. Thêm vài accident_reports mẫu cho business demo
//
// Chạy:  node sql/seed.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const URL = process.env.DATABASE_URL;
const SO_USERNAME = 'admin';
const SO_PASSWORD = '123456';
const DN_USERNAME = 'doanhnghiep';
const DN_PASSWORD = '123456';

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
      'DN-DEMO-0001',
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
  const rows = JSON.stringify({ '1': [2, 1, 1, 10, 0, 5, 0, 5, 0, 10, 0], '101': [2, 1, 1, 10, 0, 5, 0, 5, 0, 10, 0] });

  await c.query(
    `INSERT INTO accident_reports
       (enterprise_id, config_id, ten, mst, ky, status, rows, chi_tiet_rows,
        province, ward, loai_hinh, so_lao_dong, so_ld_co_bao_hiem, so_vu,
        so_vu_co_nguoi_chet, so_vu_co_2_nguoi_bi_nan, so_nguoi_bi_nan, so_ld_nu,
        so_nguoi_bi_chet, so_nguoi_bi_thuong_nang, so_ngay_nghi, tong_so_tien,
        chi_phi_y_te, chi_phi_tra_luong, boi_thuong_tro_cap, thiet_hai_tai_san, submitted_at)
     VALUES ($1,$2,$3,$4,$5,'Đã nộp',$6::jsonb,'[]'::jsonb,
        'Thành phố Hồ Chí Minh','Phường Bình Thọ','Công ty trách nhiệm hữu hạn',
        50,45,2,1,1,10,5,5,5,20,6000000,2000000,2000000,2000000,20000000, now())`,
    [businessId, configId, 'CÔNG TY TNHH DEMO VNA', 'DN-DEMO-0001', ky, rows],
  );
  console.log('✓ thêm 1 accident_report mẫu (trạng thái Đã nộp)');
}

(async () => {
  const c = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await runSqlFile(c, '001_new_resources.sql');
    await runSqlFile(c, '002_seed.sql');
    await seedSoAdmin(c);
    const { businessId } = await seedDnAccount(c);
    await seedSampleReports(c, businessId);
    console.log('\n=== HOÀN TẤT SEED ===');
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
