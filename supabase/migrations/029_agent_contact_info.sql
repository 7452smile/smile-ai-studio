-- 为 agents 表添加联系方式字段

ALTER TABLE agents ADD COLUMN IF NOT EXISTS contact_wechat TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS contact_telegram TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS enable_telegram BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS enable_email BOOLEAN DEFAULT false;
