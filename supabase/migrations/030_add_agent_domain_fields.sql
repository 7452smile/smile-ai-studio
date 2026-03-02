-- 为 payment_orders 和 user_profiles 添加 agent_domain 字段用于统计

-- 1. payment_orders 表添加 agent_domain
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS agent_domain TEXT;
CREATE INDEX IF NOT EXISTS idx_payment_orders_agent_domain ON payment_orders(agent_domain);

-- 2. user_profiles 表添加 agent_domain
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS agent_domain TEXT;
CREATE INDEX IF NOT EXISTS idx_user_profiles_agent_domain ON user_profiles(agent_domain);

COMMENT ON COLUMN payment_orders.agent_domain IS '代理域名，用于统计代理订单';
COMMENT ON COLUMN user_profiles.agent_domain IS '注册时的代理域名，用于统计代理用户';
