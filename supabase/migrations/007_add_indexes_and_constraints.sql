-- ============================================================
-- 性能优化：添加缺失的索引 + 积分安全约束
-- ============================================================

-- 支付订单按用户查询
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_phone ON payment_orders(user_phone);

-- 用户订阅按用户查询 + 到期时间查询
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_phone ON user_subscriptions(user_phone);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(period_end) WHERE status = 'active';

-- 生成任务按用户+状态查询（并发检查高频使用）
CREATE INDEX IF NOT EXISTS idx_generation_tasks_user_status ON generation_tasks(user_phone, status) WHERE status IN ('processing', 'pending');

-- 积分不能为负数
ALTER TABLE user_profiles ADD CONSTRAINT chk_credits_non_negative CHECK (credits >= 0);
