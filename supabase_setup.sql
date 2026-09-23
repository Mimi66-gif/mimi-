-- =====================================================
-- 🎨 متحف ميمي الفني — Supabase Database Setup (v2)
-- شغّلي هذا الكود في: Supabase → SQL Editor → New Query
-- =====================================================

-- إنشاء الجداول (إذا لم تكن موجودة)
CREATE TABLE IF NOT EXISTS drawings (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title          TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'عام',
  category_label TEXT,
  description    TEXT DEFAULT '',
  image_url      TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS life_entries (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title          TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'يوميات',
  category_label TEXT,
  date_label     TEXT DEFAULT '',
  description    TEXT DEFAULT '',
  image_url      TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- تفعيل نظام الأمان
ALTER TABLE drawings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_entries ENABLE ROW LEVEL SECURITY;

-- حذف الـ policies القديمة إن وُجدت ثم إعادة إنشائها
DROP POLICY IF EXISTS "public_read_drawings"   ON drawings;
DROP POLICY IF EXISTS "public_insert_drawings" ON drawings;
DROP POLICY IF EXISTS "public_delete_drawings" ON drawings;

DROP POLICY IF EXISTS "public_read_life"   ON life_entries;
DROP POLICY IF EXISTS "public_insert_life" ON life_entries;
DROP POLICY IF EXISTS "public_delete_life" ON life_entries;

-- صلاحية القراءة للجميع
CREATE POLICY "public_read_drawings"
  ON drawings FOR SELECT USING (true);

CREATE POLICY "public_read_life"
  ON life_entries FOR SELECT USING (true);

-- صلاحية الإضافة
CREATE POLICY "public_insert_drawings"
  ON drawings FOR INSERT WITH CHECK (true);

CREATE POLICY "public_insert_life"
  ON life_entries FOR INSERT WITH CHECK (true);

-- صلاحية الحذف
CREATE POLICY "public_delete_drawings"
  ON drawings FOR DELETE USING (true);

CREATE POLICY "public_delete_life"
  ON life_entries FOR DELETE USING (true);
