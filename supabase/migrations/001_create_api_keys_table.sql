-- Freepik API Key 池
CREATE TABLE freepik_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key TEXT NOT NULL UNIQUE,
    remaining_credits INTEGER NOT NULL DEFAULT 50000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    note TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disabled_at TIMESTAMP WITH TIME ZONE
);

-- 索引：快速查找可用且余额最高的 Key
CREATE INDEX idx_freepik_keys_active_credits ON freepik_api_keys (is_active, remaining_credits DESC);

-- 注释
COMMENT ON TABLE freepik_api_keys IS 'Freepik API Key 轮询池';
COMMENT ON COLUMN freepik_api_keys.remaining_credits IS '剩余积分，可手动修改';
COMMENT ON COLUMN freepik_api_keys.is_active IS '是否可用，余额耗尽自动设为 false';
COMMENT ON COLUMN freepik_api_keys.note IS '备注信息';
COMMENT ON COLUMN freepik_api_keys.disabled_at IS '弃用时间，用于历史查询';
