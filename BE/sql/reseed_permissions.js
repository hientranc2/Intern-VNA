/* eslint-disable */
// Reseed bảng `permissions` bằng cây quyền THẬT theo module Role Sở.
//   - Xóa toàn bộ quyền placeholder tiếng Anh cũ (Department/Role/User).
//   - Chèn 9 nhóm × {Xem, Thêm, Sửa, Xóa} = 45 quyền tiếng Việt.
//   - Dọn perms của roles: bỏ mã quyền không còn tồn tại; set lại 3 role demo.
//
// Chạy:  node sql/reseed_permissions.js
const { Client } = require('pg');
require('dotenv').config();

const URL = process.env.DATABASE_URL;

// [code module, tên nhóm, số La Mã] — id = code để FE link parentId nhất quán.
const MODULES = [
  ['PERMISSION',       'Phân quyền',              'I',    'phân quyền'],
  ['ROLE',             'Vai trò',                 'II',   'vai trò'],
  ['USER',             'Người dùng',              'III',  'người dùng'],
  ['ENTERPRISE_TYPE',  'Loại hình doanh nghiệp',  'IV',   'loại hình doanh nghiệp'],
  ['BUSINESS_SECTOR',  'Ngành nghề kinh doanh',   'V',    'ngành nghề kinh doanh'],
  ['ENTERPRISE',       'Quản lý doanh nghiệp',    'VI',   'doanh nghiệp'],
  ['REPORT_CONFIG',    'Cấu hình báo cáo',        'VII',  'cấu hình báo cáo'],
  ['CATEGORY',         'Khai báo danh mục',       'VIII', 'danh mục'],
  ['ACCIDENT_REPORT',  'Báo cáo TNLĐ',            'IX',   'báo cáo TNLĐ'],
  ['SIGN_REPORT',      'Ký báo cáo',              'X',    'ký báo cáo'],
];
const ACTIONS = [
  ['VIEW',   '1', 'Xem'],
  ['CREATE', '2', 'Thêm'],
  ['UPDATE', '3', 'Sửa'],
  ['DELETE', '4', 'Xóa'],
];

function buildTree() {
  const rows = [];
  let sort = 0;
  for (const [mod, ten, roman, phrase] of MODULES) {
    const groupCode = `SO_G_${mod}`;
    rows.push({ id: groupCode, type: 'Group', code: groupCode, name: ten, parentId: null, stt: roman, sort: sort++ });
    for (const [act, stt, verb] of ACTIONS) {
      const code = `SO_C_${mod}_${act}`;
      rows.push({ id: code, type: 'Component', code, name: `${verb} ${phrase}`, parentId: groupCode, stt, sort: sort++ });
    }
  }
  return rows;
}

async function reseedPermissions(c, rows) {
  await c.query('DELETE FROM permissions');
  for (const r of rows) {
    await c.query(
      `INSERT INTO permissions (id, type, code, name, parent_id, stt, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [r.id, r.type, r.code, r.name, r.parentId, r.stt, r.sort],
    );
  }
  console.log(`✓ permissions: nạp lại ${rows.length} quyền thật (${MODULES.length} nhóm × 4 thao tác + ${MODULES.length} nhóm)`);
}

async function fixRolePerms(c, rows) {
  const valid = new Set(rows.filter((r) => r.type === 'Component').map((r) => r.code));
  const code = (mod, act) => `SO_C_${mod}_${act}`;
  const all = [...valid];
  const viewOnly = [...valid].filter((x) => x.endsWith('_VIEW'));
  const demo = {
    Role1: [ // Manager — quản trị DN + báo cáo
      code('ENTERPRISE', 'VIEW'), code('ENTERPRISE', 'CREATE'), code('ENTERPRISE', 'UPDATE'), code('ENTERPRISE', 'DELETE'),
      code('ACCIDENT_REPORT', 'VIEW'), code('ACCIDENT_REPORT', 'UPDATE'),
    ],
    Role2: viewOnly,                                  // Employee — chỉ xem
    Role3: all,                                        // CEO — toàn quyền
  };

  const roles = (await c.query('SELECT id, ma, perms FROM roles')).rows;
  let changed = 0;
  for (const role of roles) {
    let next;
    if (demo[role.ma]) {
      next = demo[role.ma];
    } else {
      const current = Array.isArray(role.perms) ? role.perms : [];
      next = current.filter((p) => valid.has(p)); // bỏ mã quyền chết
    }
    const before = JSON.stringify(Array.isArray(role.perms) ? role.perms : []);
    if (JSON.stringify(next) !== before) {
      await c.query('UPDATE roles SET perms = $1::jsonb WHERE id = $2', [JSON.stringify(next), role.id]);
      changed++;
    }
  }
  console.log(`✓ roles: cập nhật perms ${changed}/${roles.length} (bỏ mã chết, set lại Role1/2/3 demo)`);
}

(async () => {
  const c = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const rows = buildTree();
    await reseedPermissions(c, rows);
    await fixRolePerms(c, rows);
    console.log('\n=== HOÀN TẤT RESEED PERMISSIONS ===');
  } finally {
    await c.end();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
