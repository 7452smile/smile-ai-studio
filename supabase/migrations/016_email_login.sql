-- 邮箱登录支持

-- user_profiles 添加 email 列
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- verification_codes 添加 email 列，phone 改为可空
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE verification_codes ALTER COLUMN phone DROP NOT NULL;

-- 约束：phone 和 email 至少有一个非空
ALTER TABLE verification_codes ADD CONSTRAINT chk_phone_or_email
  CHECK (phone IS NOT NULL OR email IS NOT NULL);
