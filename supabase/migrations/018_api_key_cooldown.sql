-- 添加 API Key 冷却时间字段（触发限流后 24H 不使用）
ALTER TABLE freepik_api_keys ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ DEFAULT NULL;
