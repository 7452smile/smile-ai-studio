-- ============================================================
-- 014: 将 user_phone 列改为可空
-- 前置条件：所有 edge function 已迁移到 user_id 标识
-- user_phone 列保留用于历史数据查询，但不再是必填字段
-- ============================================================

-- generation_tasks
ALTER TABLE generation_tasks ALTER COLUMN user_phone DROP NOT NULL;

-- payment_orders
ALTER TABLE payment_orders ALTER COLUMN user_phone DROP NOT NULL;

-- user_subscriptions
ALTER TABLE user_subscriptions ALTER COLUMN user_phone DROP NOT NULL;

-- referral_codes
ALTER TABLE referral_codes ALTER COLUMN user_phone DROP NOT NULL;

-- referral_rewards
ALTER TABLE referral_rewards ALTER COLUMN referrer_phone DROP NOT NULL;
ALTER TABLE referral_rewards ALTER COLUMN referee_phone DROP NOT NULL;

-- redemption_records
ALTER TABLE redemption_records ALTER COLUMN user_phone DROP NOT NULL;

-- failed_refunds
ALTER TABLE failed_refunds ALTER COLUMN user_phone DROP NOT NULL;
