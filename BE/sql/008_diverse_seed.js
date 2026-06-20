/* eslint-disable */
// Seed dữ liệu ĐA DẠNG cho toàn hệ thống — idempotent, có thể chạy lại nhiều lần.
//   - Ngành nghề (business_sectors): thêm chuỗi cấp 1→4 nhiều lĩnh vực.
//   - Users theo từng role riêng biệt (Role1..Role10), mật khẩu 123456.
//   - Doanh nghiệp đa tỉnh / loại hình / ngành nghề (+ account đăng nhập DN).
//   - Báo cáo TNLĐ (accident_reports) + ATVSLĐ (atvsld_reports) trải năm 2022..2025,
//     nhiều trạng thái khác nhau.
// Quy ước: username DN = MST (đúng 10 chữ số, dải '03800002xx'); user Sở = 'role_*';
// mật khẩu mặc định mọi tài khoản seed = 12345678.
// Idempotent: DN nhận diện theo tax_code; reports dọn theo enterprise_id của DN seed.
//
// Chạy:  node sql/008_diverse_seed.js
const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const PROVINCES = [
  ['Thành phố Hồ Chí Minh', 'Phường Bến Nghé'],
  ['Thành phố Hà Nội', 'Phường Tràng Tiền'],
  ['Thành phố Đà Nẵng', 'Phường Hải Châu'],
  ['Tỉnh Đồng Nai', 'Phường Tân Mai'],
  ['Tỉnh Bình Dương', 'Phường Phú Hòa'],
  ['Thành phố Hải Phòng', 'Phường Máy Tơ'],
  ['Thành phố Cần Thơ', 'Phường Cái Khế'],
  ['Tỉnh Quảng Ninh', 'Phường Hồng Hải'],
];

// Chuỗi ngành nghề mới: [ma, ten, cap, cha]. Idempotent qua ON CONFLICT(ma).
const SECTORS = [
  // CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO (C) — mở rộng
  ['13', '– Dệt', 2, 'C'], ['131', '– Sản xuất sợi, vải dệt thoi', 3, '13'], ['1311', '– Sản xuất sợi', 4, '131'],
  ['14', '– Sản xuất trang phục', 2, 'C'], ['141', '– May trang phục', 3, '14'], ['1410', '– May trang phục (trừ trang phục từ da lông thú)', 4, '141'],
  ['16', '– Chế biến gỗ và sản xuất sản phẩm từ gỗ', 2, 'C'], ['161', '– Cưa, xẻ, bào gỗ', 3, '16'], ['1610', '– Cưa, xẻ, bào gỗ và bảo quản gỗ', 4, '161'],
  ['20', '– Sản xuất hóa chất và sản phẩm hóa chất', 2, 'C'], ['201', '– Sản xuất hóa chất cơ bản', 3, '20'], ['2011', '– Sản xuất hóa chất cơ bản', 4, '201'],
  ['25', '– Sản xuất sản phẩm từ kim loại đúc sẵn', 2, 'C'], ['251', '– Sản xuất cấu kiện kim loại', 3, '25'], ['2511', '– Sản xuất cấu kiện kim loại', 4, '251'],
  ['28', '– Sản xuất máy móc, thiết bị chưa phân vào đâu', 2, 'C'], ['281', '– Sản xuất máy thông dụng', 3, '28'], ['2811', '– Sản xuất động cơ, tua bin', 4, '281'],
  // SẢN XUẤT VÀ PHÂN PHỐI ĐIỆN (D)
  ['D', 'SẢN XUẤT VÀ PHÂN PHỐI ĐIỆN, KHÍ ĐỐT, NƯỚC NÓNG', 1, ''],
  ['35', '– Sản xuất, phân phối điện, khí đốt', 2, 'D'], ['351', '– Sản xuất, truyền tải và phân phối điện', 3, '35'], ['3510', '– Sản xuất, truyền tải và phân phối điện', 4, '351'],
  // XÂY DỰNG (F)
  ['F', 'XÂY DỰNG', 1, ''],
  ['41', '– Xây dựng nhà các loại', 2, 'F'], ['410', '– Xây dựng nhà các loại', 3, '41'], ['4101', '– Xây dựng nhà để ở', 4, '410'],
  ['42', '– Xây dựng công trình kỹ thuật dân dụng', 2, 'F'], ['421', '– Xây dựng công trình đường bộ', 3, '42'], ['4211', '– Xây dựng công trình đường bộ', 4, '421'], ['4212', '– Xây dựng cầu, hầm', 4, '421'],
  // VẬN TẢI KHO BÃI (H)
  ['H', 'VẬN TẢI KHO BÃI', 1, ''],
  ['49', '– Vận tải đường bộ và đường ống', 2, 'H'], ['492', '– Vận tải hàng hóa đường bộ', 3, '49'], ['4933', '– Vận tải hàng hóa bằng đường bộ', 4, '492'],
  ['52', '– Kho bãi và các hoạt động hỗ trợ vận tải', 2, 'H'], ['521', '– Kho bãi và lưu giữ hàng hóa', 3, '52'], ['5210', '– Kho bãi và lưu giữ hàng hóa', 4, '521'],
  // DỊCH VỤ LƯU TRÚ VÀ ĂN UỐNG (I)
  ['I', 'DỊCH VỤ LƯU TRÚ VÀ ĂN UỐNG', 1, ''],
  ['56', '– Dịch vụ ăn uống', 2, 'I'], ['561', '– Nhà hàng và dịch vụ ăn uống phục vụ lưu động', 3, '56'], ['5610', '– Nhà hàng, quán ăn', 4, '561'],
  // THÔNG TIN VÀ TRUYỀN THÔNG (J)
  ['J', 'THÔNG TIN VÀ TRUYỀN THÔNG', 1, ''],
  ['62', '– Lập trình máy vi tính, dịch vụ tư vấn', 2, 'J'], ['620', '– Lập trình, tư vấn máy vi tính', 3, '62'], ['6201', '– Lập trình máy vi tính', 4, '620'], ['6202', '– Tư vấn máy vi tính và quản trị hệ thống', 4, '620'],
  // Y TẾ (Q)
  ['Q', 'Y TẾ VÀ HOẠT ĐỘNG TRỢ GIÚP XÃ HỘI', 1, ''],
  ['86', '– Hoạt động y tế', 2, 'Q'], ['861', '– Hoạt động của các bệnh viện, trạm y tế', 3, '86'], ['8610', '– Hoạt động của các bệnh viện', 4, '861'],
];

// Mỗi role một user đại diện: [usernameSuffix, fullName, jobTitle, roleId, roleString].
const ROLE_USERS = [
  ['manager', 'Lê Quang Đại', 'Trưởng phòng', 1, 'USER'],
  ['employee', 'Phạm Thị Mai', 'Cán bộ', 2, 'USER'],
  ['ceo', 'Trần Hữu Phước', 'Tổng giám đốc', 3, 'USER'],
  ['ketoan', 'Nguyễn Thị Lan', 'Kế toán trưởng', 4, 'USER'],
  ['nhansu', 'Đỗ Văn Hùng', 'Trưởng phòng nhân sự', 5, 'USER'],
  ['thamdinh', 'Vũ Minh Tuấn', 'Cán bộ thẩm định', 6, 'USER'],
  ['chinhanh', 'Hoàng Thị Thu', 'Quản lý chi nhánh', 7, 'USER'],
  ['antoan', 'Bùi Văn Sơn', 'Giám sát an toàn', 8, 'USER'],
  ['thuky', 'Ngô Thị Hạnh', 'Thư ký', 9, 'USER'],
  ['quantri2', 'Đặng Quốc Bảo', 'Quản trị viên hệ thống', 10, 'ADMIN'],
];

// Doanh nghiệp seed: [tên, loại hình, ngành (cap4 ten)].
const BIZ = [
  ['CÔNG TY TNHH MAY MẶC AN PHÚ', 'Công ty TNHH', '– May trang phục (trừ trang phục từ da lông thú)'],
  ['CÔNG TY CỔ PHẦN XÂY DỰNG HẠ TẦNG MIỀN TRUNG', 'Công ty cổ phần', '– Xây dựng công trình đường bộ'],
  ['CÔNG TY TNHH CƠ KHÍ CHÍNH XÁC TOÀN CẦU', 'Công ty TNHH', '– Sản xuất cấu kiện kim loại'],
  ['CÔNG TY CỔ PHẦN HÓA CHẤT CÔNG NGHIỆP VIỆT', 'Công ty cổ phần', '– Sản xuất hóa chất cơ bản'],
  ['CÔNG TY TNHH VẬN TẢI HÀNG HÓA ĐÔNG DƯƠNG', 'Công ty TNHH', '– Vận tải hàng hóa bằng đường bộ'],
  ['CÔNG TY CỔ PHẦN ĐIỆN LỰC HOÀNG SƠN', 'Công ty cổ phần', '– Sản xuất, truyền tải và phân phối điện'],
  ['CÔNG TY TNHH PHẦN MỀM SAO BẮC', 'Công ty TNHH', '– Lập trình máy vi tính'],
  ['BỆNH VIỆN ĐA KHOA HỒNG ĐỨC', 'Doanh nghiệp tư nhân', '– Hoạt động của các bệnh viện'],
  ['CÔNG TY TNHH CHẾ BIẾN GỖ XUẤT KHẨU TÂN LẬP', 'Công ty TNHH', '– Cưa, xẻ, bào gỗ và bảo quản gỗ'],
  ['CÔNG TY CỔ PHẦN THỰC PHẨM SẠCH ĐỒNG XANH', 'Công ty cổ phần', '– Nhà hàng, quán ăn'],
];

const STATUSES_TNLD = ['Đang báo cáo', 'Đã nộp', 'Đã tiếp nhận'];
const STATUSES_ATVSLD = ['Chờ báo cáo', 'Nhập liệu', 'Chờ tiếp nhận', 'Từ chối', 'Hoàn thành'];
const YEARS = [2022, 2023, 2024, 2025];

function rnd(seed) { return Math.abs(Math.sin(seed) * 10000) % 1; }
function ri(seed, max) { return Math.floor(rnd(seed) * (max + 1)); }

async function seedSectors(c) {
  let n = 0;
  for (const [ma, ten, cap, cha] of SECTORS) {
    const r = await c.query(
      `INSERT INTO business_sectors (ma, ten, cap, cha) VALUES ($1,$2,$3,$4)
       ON CONFLICT (ma) DO NOTHING`,
      [ma, ten, cap, cha],
    );
    n += r.rowCount;
  }
  console.log(`✓ business_sectors: +${n} ngành mới (đã có thì bỏ qua)`);
}

async function seedRoleUsers(c, hash) {
  let n = 0;
  for (const [suffix, fullName, jobTitle, roleId, roleStr] of ROLE_USERS) {
    const username = `role_${suffix}`;
    const r = await c.query(
      `INSERT INTO users (username, password, email, full_name, job_title, role, role_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (username) DO UPDATE SET role_id = EXCLUDED.role_id, role = EXCLUDED.role,
         job_title = EXCLUDED.job_title, password = EXCLUDED.password`,
      [username, hash, `${username}@vna.local`, fullName, jobTitle, roleStr, roleId],
    );
    n += r.rowCount;
  }
  console.log(`✓ users theo role: ${ROLE_USERS.length} user (role_*), mật khẩu 12345678`);
}

async function seedBusinesses(c, hash) {
  const ids = [];
  for (let i = 0; i < BIZ.length; i++) {
    const [name, type, industry] = BIZ[i];
    // MST hợp lệ: đúng 10 chữ số (khớp regex /^\d{10}$/ của form đăng ký DN).
    const tax = String(380000201 + i).padStart(10, '0');
    const [province, ward] = PROVINCES[i % PROVINCES.length];
    // Tài khoản đăng nhập DN: username = MST (đúng quy ước business.service đăng ký).
    const accUser = tax;
    let acc = await c.query('SELECT id FROM accounts WHERE username=$1', [accUser]);
    let accountId;
    if (acc.rowCount > 0) {
      accountId = acc.rows[0].id;
    } else {
      const ins = await c.query(
        `INSERT INTO accounts (username, password, role) VALUES ($1,$2,'DoanhNghiep') RETURNING id`,
        [accUser, hash],
      );
      accountId = ins.rows[0].id;
    }
    const existing = await c.query('SELECT id FROM businesses WHERE tax_code=$1', [tax]);
    if (existing.rowCount > 0) {
      ids.push({ id: existing.rows[0].id, name, tax, type, province, ward });
      continue;
    }
    const biz = await c.query(
      `INSERT INTO businesses
         (business_name, tax_code, business_type, main_industry, registered_province, registered_ward, email, is_active, account_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) RETURNING id`,
      [name, tax, type, industry, province, ward, `${accUser}@vna.local`, accountId],
    );
    ids.push({ id: biz.rows[0].id, name, tax, type, province, ward });
  }
  console.log(`✓ businesses seed: ${ids.length} DN (MST 10 số 03800002xx) — đăng nhập bằng MST / 12345678`);
  return ids;
}

async function getConfigByYear(c) {
  const map = {};
  for (const y of YEARS) {
    const r = await c.query(
      `SELECT id FROM report_configs WHERE nam=$1 AND ky='Cả năm' ORDER BY id LIMIT 1`,
      [String(y)],
    );
    map[y] = r.rowCount > 0 ? r.rows[0].id : null;
  }
  return map;
}

async function seedAccidentReports(c, businesses, cfgByYear) {
  // Xóa report cũ của DN seed (theo enterprise_id) để idempotent
  await c.query(`DELETE FROM accident_reports WHERE enterprise_id = ANY($1)`, [
    businesses.map((b) => b.id),
  ]);
  let n = 0;
  let seed = 1;
  for (let bi = 0; bi < businesses.length; bi++) {
    const b = businesses[bi];
    for (let yi = 0; yi < YEARS.length; yi++) {
      const y = YEARS[yi];
      // Mỗi DN vắng mặt đúng 1 năm khác nhau (bi%4) → tập DN mỗi năm khác nhau, filter nhìn rõ.
      if (bi % 4 === yi) continue;
      const cfg = cfgByYear[y];
      if (!cfg) continue;
      const status = STATUSES_TNLD[seed % STATUSES_TNLD.length];
      const soVu = ri(seed * 1.7, 5);
      const rows = JSON.stringify({
        '1': [2 + ri(seed, 8), ri(seed + 1, 3), ri(seed + 2, 2), 10 + ri(seed, 20), 0, 5, 0, 5, 0, 10, 0],
        '101': [1 + ri(seed + 3, 4), ri(seed + 4, 2), 0, 5, 0, 3, 0, 2, 0, 6, 0],
      });
      await c.query(
        `INSERT INTO accident_reports
           (enterprise_id, config_id, ten, mst, ky, status, rows, chi_tiet_rows, phan_loai_rows,
            province, ward, loai_hinh, so_lao_dong, so_ld_co_bao_hiem, so_vu, so_vu_co_nguoi_chet,
            so_nguoi_bi_nan, so_ld_nu, so_nguoi_bi_chet, so_ngay_nghi, tong_so_tien, submitted_at)
         VALUES ($1,$2,$3,$4,'Cả năm',$5,$6::jsonb,'[]'::jsonb,'{}'::jsonb,$7,$8,$9,
            $10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          b.id, cfg, b.name, b.tax, status, rows, b.province, b.ward, b.type,
          50 + ri(seed, 200), 40 + ri(seed + 1, 150), soVu, ri(seed * 2.1, 1),
          soVu + ri(seed, 3), ri(seed + 5, 60), ri(seed * 3.3, 1), soVu * 10,
          (1000000 * (1 + ri(seed, 20))), status === 'Đang báo cáo' ? null : new Date(`${y}-07-15`),
        ],
      );
      n++; seed++;
    }
  }
  console.log(`✓ accident_reports seed: +${n} báo cáo TNLĐ (DN seed, 2022..2025, đủ trạng thái)`);
}

async function seedAtvsldReports(c, businesses) {
  await c.query(`DELETE FROM atvsld_reports WHERE enterprise_id = ANY($1)`, [
    businesses.map((b) => b.id),
  ]);
  const declTemplate = (seed) => JSON.stringify({
    tongLaoDong: String(50 + ri(seed, 200)), nguoiATVSLD: String(ri(seed, 3)), nguoiYTe: String(ri(seed + 1, 2)),
    laoDongNu: String(ri(seed + 2, 80)), tnldTongVu: String(ri(seed * 1.5, 4)),
    bnnChiPhi: String((10 + ri(seed, 30))) + '.5', skLoai2: String(ri(seed, 10)), skLoai3: String(ri(seed + 1, 8)),
    hlNhom1: `${5 + ri(seed, 10)}/${15 + ri(seed, 5)}`, hlTongChiPhi: String(10 + ri(seed, 20)) + '.2',
    mayTongSo: String(ri(seed, 8)), qtTongMau: String(20 + ri(seed, 60)), qtKhongDat: String(ri(seed, 15)),
    thoiDiemDanhGia: `0${1 + ri(seed, 8)}/2024`,
  });
  let n = 0, seed = 100;
  for (let bi = 0; bi < businesses.length; bi++) {
    const b = businesses[bi];
    for (let yi = 0; yi < YEARS.length; yi++) {
      const y = YEARS[yi];
      if (bi % 4 === yi) continue; // mỗi DN vắng 1 năm → tập DN mỗi năm khác nhau
      for (const ky of ['6 tháng', 'Cả năm']) {
        const status = STATUSES_ATVSLD[seed % STATUSES_ATVSLD.length];
        const batDau = ky === '6 tháng' ? `01/07/${y}` : `15/12/${y}`;
        const ketThuc = ky === '6 tháng' ? `05/07/${y}` : `10/01/${y + 1}`;
        const nop = (status === 'Chờ báo cáo' || status === 'Nhập liệu')
          ? ''
          : (ky === '6 tháng' ? `02/07/${y}` : `28/12/${y}`);
        const lyDo = status === 'Từ chối' ? 'Số liệu chưa khớp, đề nghị kiểm tra lại' : null;
        await c.query(
          `INSERT INTO atvsld_reports
             (enterprise_id, ten, mst, nam, ky, ngay_bat_dau, ngay_ket_thuc, ngay_nop, nguoi_chinh_sua,
              province, ward, status, ly_do_tu_choi, declaration, submitted_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,now())`,
          [
            b.id, b.name, b.tax, y, ky, batDau, ketThuc, nop, 'Người đại diện DN',
            b.province, b.ward, status, lyDo, declTemplate(seed),
            nop ? (ky === '6 tháng' ? new Date(`${y}-07-02`) : new Date(`${y}-12-28`)) : null,
          ],
        );
        n++; seed++;
      }
    }
  }
  console.log(`✓ atvsld_reports seed: +${n} báo cáo ATVSLĐ (DN seed, 2022..2025, 6 tháng + Cả năm, đủ trạng thái)`);
}

// Seed toàn bộ dữ liệu đa dạng trên một client đã kết nối sẵn (tái dùng trong seed.js).
async function seedDiverse(c) {
  // Mật khẩu mặc định cho mọi tài khoản seed (user Sở role_* và DN dn_seed_*) = 12345678.
  const hash = await bcrypt.hash('12345678', 10);
  await seedSectors(c);
  await seedRoleUsers(c, hash);
  const businesses = await seedBusinesses(c, hash);
  const cfgByYear = await getConfigByYear(c);
  await seedAccidentReports(c, businesses, cfgByYear);
  await seedAtvsldReports(c, businesses);
}

module.exports = { seedDiverse };

// Chạy độc lập:  node sql/008_diverse_seed.js
if (require.main === module) {
  (async () => {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();
    try {
      await seedDiverse(c);
      console.log('\n=== HOÀN TẤT SEED ĐA DẠNG ===');
    } finally {
      await c.end();
    }
  })().catch((e) => { console.error('FATAL', e); process.exit(1); });
}
