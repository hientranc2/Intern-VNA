/* eslint-disable */
const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  try {
    const res = await c.query('SELECT * FROM atvsld_reports');
    console.log(`Fetched ${res.rowCount} reports to inspect`);

    for (const r of res.rows) {
      let history = r.history || [];
      
      // If history already has creation event, skip it
      const hasCreate = history.some((h) => h.action === 'đã tạo bản nháp báo cáo');
      if (hasCreate) {
        continue;
      }

      const list = [];
      // 1. Creation event
      list.push({
        timestamp: r.created_at || new Date(),
        actor: r.ten,
        action: 'đã tạo bản nháp báo cáo',
      });

      // 2. Submission event
      if (r.ngay_nop && r.ngay_nop !== '–' && r.ngay_nop !== '') {
        list.push({
          timestamp: r.submitted_at || r.created_at || new Date(),
          actor: r.ten,
          action: 'đã gửi báo cáo',
        });
      }

      // 3. Current review status (if it was approved or rejected)
      // If history already had review events (e.g. they approved it recently), we copy those.
      // Otherwise, we generate them.
      const hasReview = history.some((h) => h.action === 'đã duyệt báo cáo' || h.action === 'từ chối báo cáo');
      if (hasReview) {
        list.push(...history);
      } else {
        if (r.status === 'Hoàn thành') {
          list.push({
            timestamp: r.updated_at || new Date(),
            actor: 'Quản trị viên Sở',
            action: 'đã duyệt báo cáo',
          });
        } else if (r.status === 'Từ chối') {
          list.push({
            timestamp: r.updated_at || new Date(),
            actor: 'Quản trị viên Sở',
            action: 'từ chối báo cáo',
            lyDo: r.ly_do_tu_choi || undefined,
          });
        }
      }

      // Update in DB
      await c.query('UPDATE atvsld_reports SET history = $1::jsonb WHERE id = $2', [
        JSON.stringify(list),
        r.id,
      ]);
      console.log(`Updated history for report ID ${r.id}: ${r.ten}`);
    }
    console.log('✓ Successfully migrated all reports history');
  } finally {
    await c.end();
  }
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
