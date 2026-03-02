-- 为所有现有代理补全缺失的套餐定价记录

DO $$
DECLARE
    v_agent RECORD;
    v_tier RECORD;
BEGIN
    -- 遍历所有代理
    FOR v_agent IN SELECT id FROM agents LOOP
        -- 遍历所有套餐（从 subscription_tiers 表中读取）
        FOR v_tier IN SELECT id FROM subscription_tiers WHERE id != 'free' LOOP
            -- 如果该代理的该套餐定价记录不存在，则插入
            INSERT INTO agent_tier_pricing (agent_id, tier_id, cost_price, sell_price, is_active)
            VALUES (v_agent.id, v_tier.id, 0, 0, false)
            ON CONFLICT (agent_id, tier_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
