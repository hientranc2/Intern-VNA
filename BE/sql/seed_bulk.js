/* eslint-disable */
// Seed bổ sung — nâng mỗi bảng lên ~10 dòng dữ liệu mẫu.
// An toàn chạy lại nhiều lần (idempotent: ON CONFLICT / NOT EXISTS / guard theo count).
//
// KHÔNG đụng tới:
//   - permissions   (15 dòng — cây phân quyền cố định, chèn thêm sẽ hỏng FE)
//   - business_sectors (33 dòng — danh mục ngành nghề tham chiếu, đã > 10)
//
// Chạy:  node sql/seed_bulk.js   (sau khi đã chạy seed.js để có bảng + tài khoản gốc)
const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const URL = process.env.DATABASE_URL;
const PASS = '123456';

const PROVINCES = ['Thành phố Hồ Chí Minh', 'Thành phố Hà Nội', 'Tỉnh Đồng Nai', 'Thành phố Đà Nẵng', 'Tỉnh Bình Dương'];
const WARDS = ['Phường Bình Thọ', 'Phường Bến Nghé', 'Phường Tân Định', 'Phường An Khánh', 'Phường Thủ Dầu Một'];

async function count(c, table) {
  const r = await c.query(`SELECT count(*)::int AS n FROM ${table}`);
  return r.rows[0].n;
}

// ---------------------------------------------------------------------------
// users (Role Sở) — nâng lên 10
// ---------------------------------------------------------------------------
async function seedUsers(c) {
  const hash = await bcrypt.hash(PASS, 10);
  const data = [
    ['so_canbo01', 'Nguyễn Văn An', 'USER', 'Chuyên viên'],
    ['so_canbo02', 'Trần Thị Bình', 'USER', 'Chuyên viên'],
    ['so_canbo03', 'Lê Hoàng Cường', 'USER', 'Cán bộ thẩm định'],
    ['so_canbo04', 'Phạm Thị Dung', 'USER', 'Cán bộ thẩm định'],
    ['so_truongphong', 'Hoàng Văn Em', 'MANAGER', 'Trưởng phòng'],
    ['so_phophong', 'Vũ Thị Hoa', 'MANAGER', 'Phó phòng'],
    ['so_canbo05', 'Đặng Văn Giang', 'USER', 'Chuyên viên'],
    ['so_canbo06', 'Bùi Thị Hương', 'USER', 'Chuyên viên'],
    ['so_quantri', 'Ngô Văn Khoa', 'ADMIN', 'Quản trị hệ thống'],
  ];
  let added = 0;
  for (const [username, fullName, role, job] of data) {
    const r = await c.query(
      `INSERT INTO users (username, password, email, full_name, role, job_title, is_active, province, ward)
       VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8)
       ON CONFLICT (username) DO NOTHING`,
      [username, hash, `${username}@vna.local`, fullName, role, job,
       PROVINCES[added % PROVINCES.length], WARDS[added % WARDS.length]],
    );
    added += r.rowCount;
  }
  console.log(`✓ users: +${added} (tổng ${await count(c, 'users')})`);
}

// ---------------------------------------------------------------------------
// accounts (DN) + businesses tương ứng — nâng cả hai lên 10
// ---------------------------------------------------------------------------
async function seedAccountsAndBusinesses(c) {
  const hash = await bcrypt.hash(PASS, 10);
  const etypes = (await c.query('SELECT ten FROM enterprise_types ORDER BY id')).rows.map((r) => r.ten);
  const sectors = (await c.query("SELECT ten FROM business_sectors WHERE cap = 4 ORDER BY id LIMIT 10")).rows.map((r) => r.ten);
  const fallbackType = 'Công ty trách nhiệm hữu hạn';
  const fallbackSector = 'Hoạt động dịch vụ';

  const companies = [
    ['CÔNG TY TNHH SẢN XUẤT THÉP VIỆT', 'dn_thepviet'],
    ['CÔNG TY CỔ PHẦN XÂY DỰNG SỐ 1', 'dn_xaydung1'],
    ['CÔNG TY TNHH DỆT MAY HOÀNG GIA', 'dn_detmay'],
    ['CÔNG TY CỔ PHẦN CƠ KHÍ ĐÔNG Á', 'dn_cokhi'],
    ['CÔNG TY TNHH CHẾ BIẾN GỖ THÀNH PHÁT', 'dn_chebiengo'],
    ['CÔNG TY CỔ PHẦN HÓA CHẤT MIỀN NAM', 'dn_hoachat'],
    ['CÔNG TY TNHH ĐIỆN TỬ TÂN TIẾN', 'dn_dientu'],
    ['CÔNG TY CỔ PHẦN VẬT LIỆU XÂY DỰNG BÌNH AN', 'dn_vatlieu'],
    ['CÔNG TY TNHH LOGISTICS PHƯƠNG NAM', 'dn_logistics'],
  ];

  let accAdded = 0;
  let bizAdded = 0;
  for (let i = 0; i < companies.length; i++) {
    const [bizName, slug] = companies[i];
    // MST đúng 10 chữ số (dải 03100000xx) — đồng thời là username đăng nhập DN.
    const taxCode = String(310000001 + i).padStart(10, '0');
    // account (username = MST)
    const existAcc = await c.query('SELECT id FROM accounts WHERE username = $1', [taxCode]);
    let accountId;
    if (existAcc.rowCount > 0) {
      accountId = existAcc.rows[0].id;
    } else {
      const ins = await c.query(
        `INSERT INTO accounts (username, password, role) VALUES ($1,$2,'DoanhNghiep') RETURNING id`,
        [taxCode, hash],
      );
      accountId = ins.rows[0].id;
      accAdded++;
    }
    const r = await c.query(
      `INSERT INTO businesses
         (business_name, tax_code, business_type, main_industry,
          registered_province, registered_ward, email, representative, office_phone,
          is_active, account_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
       ON CONFLICT (tax_code) DO NOTHING`,
      [
        bizName, taxCode,
        etypes[i % etypes.length] ?? fallbackType,
        sectors[i % (sectors.length || 1)] ?? fallbackSector,
        PROVINCES[i % PROVINCES.length], WARDS[i % WARDS.length],
        `${slug}@business.local`,
        'Nguyễn Văn Đại Diện', `028${String(38000000 + i)}`,
        accountId,
      ],
    );
    bizAdded += r.rowCount;
  }
  console.log(`✓ accounts: +${accAdded} (tổng ${await count(c, 'accounts')})`);
  console.log(`✓ businesses: +${bizAdded} (tổng ${await count(c, 'businesses')})`);
}

// ---------------------------------------------------------------------------
// enterprise_types — nâng lên 10
// ---------------------------------------------------------------------------
async function seedEnterpriseTypes(c) {
  const data = [
    ['LH06', 'Công ty hợp danh'],
    ['LH07', 'Hợp tác xã'],
    ['LH08', 'Hộ kinh doanh cá thể'],
    ['LH09', 'Doanh nghiệp có vốn đầu tư nước ngoài'],
    ['LH10', 'Chi nhánh doanh nghiệp'],
  ];
  let added = 0;
  for (const [ma, ten] of data) {
    const r = await c.query(
      `INSERT INTO enterprise_types (ma, ten, active) VALUES ($1,$2,true) ON CONFLICT (ma) DO NOTHING`,
      [ma, ten],
    );
    added += r.rowCount;
  }
  console.log(`✓ enterprise_types: +${added} (tổng ${await count(c, 'enterprise_types')})`);
}

// ---------------------------------------------------------------------------
// roles — nâng lên 10
// ---------------------------------------------------------------------------
async function seedRoles(c) {
  const ALL = ['SO_C_ENTERPRISE_VIEW','SO_C_ENTERPRISE_CREATE','SO_C_ENTERPRISE_UPDATE','SO_C_ENTERPRISE_DELETE','SO_C_ROLE_VIEW','SO_C_ROLE_CREATE','SO_C_USER_VIEW','SO_C_USER_CREATE'];
  const data = [
    ['Role4', 'Kế toán trưởng', ['SO_C_ENTERPRISE_VIEW', 'SO_C_ACCIDENT_REPORT_VIEW']],
    ['Role5', 'Trưởng phòng nhân sự', ['SO_C_USER_VIEW', 'SO_C_USER_CREATE']],
    ['Role6', 'Cán bộ thẩm định', ['SO_C_ACCIDENT_REPORT_VIEW', 'SO_C_ACCIDENT_REPORT_UPDATE']],
    ['Role7', 'Quản lý chi nhánh', ['SO_C_ENTERPRISE_VIEW', 'SO_C_ENTERPRISE_UPDATE']],
    ['Role8', 'Giám sát an toàn', ['SO_C_ACCIDENT_REPORT_VIEW', 'SO_C_REPORT_CONFIG_VIEW']],
    ['Role9', 'Thư ký', ['SO_C_ENTERPRISE_VIEW']],
    ['Role10', 'Quản trị viên hệ thống', ALL],
  ];
  let added = 0;
  for (const [ma, ten, perms] of data) {
    const r = await c.query(
      `INSERT INTO roles (ma, ten, perms) VALUES ($1,$2,$3::jsonb) ON CONFLICT (ma) DO NOTHING`,
      [ma, ten, JSON.stringify(perms)],
    );
    added += r.rowCount;
  }
  console.log(`✓ roles: +${added} (tổng ${await count(c, 'roles')})`);
}

// ---------------------------------------------------------------------------
// report_configs — nâng lên 10 (không có unique key → guard theo nam+ten+ky)
// ---------------------------------------------------------------------------
async function seedReportConfigs(c) {
  const data = [
    ['2023', 'Báo cáo TNLĐ', '6 tháng', '01/07/2023', '05/07/2023', true],
    ['2024', 'Báo cáo tai nạn lao động', 'Cả năm', '01/01/2025', '28/02/2025', true],
    ['2024', 'Báo cáo TNLĐ', '6 tháng', '01/07/2024', '05/07/2024', true],
    ['2025', 'Báo cáo tai nạn lao động', 'Cả năm', '15/12/2025', '10/01/2026', true],
    ['2025', 'Báo cáo TNLĐ', '6 tháng', '01/07/2025', '05/07/2025', true],
    ['2021', 'Báo cáo tai nạn lao động', 'Cả năm', '15/12/2021', '10/01/2022', false],
    ['2020', 'Báo cáo tai nạn lao động', 'Cả năm', '15/12/2020', '10/01/2021', false],
  ];
  let added = 0;
  for (const [nam, ten, ky, batDau, ketThuc, active] of data) {
    const r = await c.query(
      `INSERT INTO report_configs (nam, ten, ky, bat_dau, ket_thuc, active)
       SELECT $1::varchar,$2::varchar,$3::varchar,$4::varchar,$5::varchar,$6::boolean
       WHERE NOT EXISTS (SELECT 1 FROM report_configs WHERE nam=$1 AND ten=$2 AND ky=$3)`,
      [nam, ten, ky, batDau, ketThuc, active],
    );
    added += r.rowCount;
  }
  console.log(`✓ report_configs: +${added} (tổng ${await count(c, 'report_configs')})`);
}

// ---------------------------------------------------------------------------
// injury_factors — nâng lên 10 (đang 9)
// ---------------------------------------------------------------------------
async function seedInjuryFactors(c) {
  const data = [
    ['Mã 10', 'Cháy, nổ'],
    ['Mã 11', 'Ngã từ trên cao'],
    ['Mã 12', 'Tiếng ồn, rung động'],
    ['Mã 13', 'Hóa chất độc hại'],
  ];
  let added = 0;
  for (const [ma, ten] of data) {
    const r = await c.query(
      `INSERT INTO injury_factors (ma, ten, active) VALUES ($1,$2,true) ON CONFLICT (ma) DO NOTHING`,
      [ma, ten],
    );
    added += r.rowCount;
  }
  console.log(`✓ injury_factors: +${added} (tổng ${await count(c, 'injury_factors')})`);
}

// ---------------------------------------------------------------------------
// injury_types — nâng lên ~10 (cây phân cấp)
// ---------------------------------------------------------------------------
async function seedInjuryTypes(c) {
  const data = [
    ['2', 'Ngực, bụng', 1, ''],
    ['21', '– Tổn thương lồng ngực', 2, '2'],
    ['210', '– Gãy xương sườn', 3, '21'],
    ['3', 'Tay', 1, ''],
    ['31', '– Tổn thương bàn tay, ngón tay', 2, '3'],
    ['310', '– Cụt ngón tay', 3, '31'],
    ['4', 'Chân', 1, ''],
    ['41', '– Tổn thương bàn chân', 2, '4'],
  ];
  let added = 0;
  for (const [ma, ten, cap, cha] of data) {
    const r = await c.query(
      `INSERT INTO injury_types (ma, ten, cap, cha) VALUES ($1,$2,$3,$4) ON CONFLICT (ma) DO NOTHING`,
      [ma, ten, cap, cha],
    );
    added += r.rowCount;
  }
  console.log(`✓ injury_types: +${added} (tổng ${await count(c, 'injury_types')})`);
}

// ---------------------------------------------------------------------------
// occupations — nâng lên ~10 (cây phân cấp)
// ---------------------------------------------------------------------------
async function seedOccupations(c) {
  const data = [
    ['2', 'Nhà chuyên môn bậc cao', 1, ''],
    ['21', '– Nhà chuyên môn về khoa học và kỹ thuật', 2, '2'],
    ['211', '– Nhà chuyên môn về khoa học vật lý và khoa học trái đất', 3, '21'],
    ['2111', '–– Nhà vật lý và thiên văn học', 4, '211'],
    ['3', 'Kỹ thuật viên và nhân viên kỹ thuật bậc trung', 1, ''],
    ['31', '– Kỹ thuật viên khoa học và kỹ thuật', 2, '3'],
    ['7', 'Lao động thủ công và các nghề liên quan', 1, ''],
    ['71', '– Lao động xây dựng và lao động liên quan', 2, '7'],
  ];
  let added = 0;
  for (const [ma, ten, cap, cha] of data) {
    const r = await c.query(
      `INSERT INTO occupations (ma, ten, cap, cha) VALUES ($1,$2,$3,$4) ON CONFLICT (ma) DO NOTHING`,
      [ma, ten, cap, cha],
    );
    added += r.rowCount;
  }
  console.log(`✓ occupations: +${added} (tổng ${await count(c, 'occupations')})`);
}

// ---------------------------------------------------------------------------
// accident_reports — nâng lên ~10 (gắn business + config thật)
// ---------------------------------------------------------------------------
async function seedAccidentReports(c) {
  const existing = await count(c, 'accident_reports');
  const target = 10;
  if (existing >= target) {
    console.log(`✓ accident_reports: đã có ${existing} (>= ${target}), bỏ qua`);
    return;
  }
  const biz = (await c.query(
    `SELECT id, business_name, tax_code, business_type, registered_province, registered_ward
     FROM businesses ORDER BY created_at LIMIT 20`,
  )).rows;
  const cfgs = (await c.query('SELECT id, ky FROM report_configs ORDER BY id')).rows;
  if (biz.length === 0 || cfgs.length === 0) {
    console.log('  thiếu businesses/report_configs, bỏ qua accident_reports');
    return;
  }

  const statuses = ['Đã nộp', 'Đã tiếp nhận', 'Đang báo cáo'];
  let added = 0;
  for (let i = existing; i < target; i++) {
    const b = biz[i % biz.length];
    const cfg = cfgs[i % cfgs.length];
    const status = statuses[i % statuses.length];
    const soVu = 1 + (i % 5);
    const soNan = soVu + (i % 3);
    const soLDNu = 10 + i;
    const soVuCoNguoiChet = i % 2;
    const soVuCo2NguoiBiNan = i % 2;
    const soNguoiBiChet = i % 2;
    const soNguoiBiThuongNang = soNan - (i % 2);
    const soNgayNghi = 20 + i * 5;
    const tongSoTien = 6000000 + i * 1000000;
    const chiPhiYTe = 2000000 + i * 500000;
    const chiPhiTraLuong = 2000000;
    const boiThuongTroCap = 2000000 + i * 300000;
    const thiethaiTaiSan = 20000000 + i * 2000000;

    const vals = [
      soVu,
      soVuCoNguoiChet,
      soVuCo2NguoiBiNan,
      soNan,
      soLDNu,
      soNguoiBiChet,
      soNguoiBiThuongNang,
      soNgayNghi,
      tongSoTien,
      chiPhiYTe,
      chiPhiTraLuong,
      boiThuongTroCap,
      thiethaiTaiSan
    ];

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
          chi_phi_y_te, chi_phi_tra_luong, boi_thuong_tro_cap, thiet_hai_tai_san,
          submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'[]'::jsonb,$26::jsonb,
          $8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
          CASE WHEN $6::varchar = 'Đang báo cáo' THEN NULL ELSE now() END)`,
      [
        b.id, cfg.id, b.business_name, b.tax_code, cfg.ky, status, phanLoaiJson,
        b.registered_province, b.registered_ward, b.business_type,
        50 + i * 10, 45 + i * 8, soVu,
        soVuCoNguoiChet, soVuCo2NguoiBiNan, soNan, soLDNu,
        soNguoiBiChet, soNguoiBiThuongNang, soNgayNghi, tongSoTien,
        chiPhiYTe, chiPhiTraLuong, boiThuongTroCap, thiethaiTaiSan,
        phanLoaiJson
      ],
    );
    added++;
  }
  console.log(`✓ accident_reports: +${added} (tổng ${await count(c, 'accident_reports')})`);
}

(async () => {
  const c = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await seedUsers(c);
    await seedEnterpriseTypes(c);
    await seedAccountsAndBusinesses(c);
    await seedRoles(c);
    await seedReportConfigs(c);
    await seedInjuryFactors(c);
    await seedInjuryTypes(c);
    await seedOccupations(c);
    await seedAccidentReports(c);
    console.log('\n=== HOÀN TẤT SEED BỔ SUNG ===');
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
