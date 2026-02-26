-- 更新订阅等级的 history_hours 和 persist_to_r2
-- 免费版: 1小时 → 24小时(1天), persist_to_r2 = true
-- 入门版: 1小时 → 168小时(7天), persist_to_r2 = true
-- 进阶版: 1小时 → 168小时(7天), persist_to_r2 = true
-- 旗舰版/工作室版/企业版: 不变

UPDATE subscription_tiers SET history_hours = 24, persist_to_r2 = true WHERE id = 'free';
UPDATE subscription_tiers SET history_hours = 168, persist_to_r2 = true WHERE id = 'starter';
UPDATE subscription_tiers SET history_hours = 168, persist_to_r2 = true WHERE id = 'advanced';
