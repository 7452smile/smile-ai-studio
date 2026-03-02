-- ============================================================
-- 025_agent_system_fixed: 代理系统（幂等版本）
-- ============================================================

-- 1.1 代理表
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id),
    domain TEXT NOT NULL UNIQUE,
    brand_name TEXT NOT NULL DEFAULT 'Smile AI Studio',
    logo_url TEXT,
    balance NUMERIC(12,2) DEFAULT 0,
    credits_rate NUMERIC(10,2) DEFAULT 100,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','disabled')),
    payment_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agents_domain ON agents(domain);

-- 1.2 代理套餐定价表
CREATE TABLE IF NOT EXISTS agent_tier_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tier_id TEXT NOT NULL REFERENCES subscription_tiers(id),
    cost_price NUMERIC(10,2) NOT NULL,
    sell_price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(agent_id, tier_id)
);

-- 1.3 代理交易记录表
CREATE TABLE IF NOT EXISTS agent_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    type TEXT NOT NULL CHECK (type IN (
        'commission','credits_purchase','sub_code_purchase',
        'withdrawal','withdrawal_reject','recharge','adjustment'
    )),
    amount NUMERIC(12,2) NOT NULL,
    balance_after NUMERIC(12,2) NOT NULL,
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_tx_agent ON agent_transactions(agent_id);

-- 1.4 代理提现表
CREATE TABLE IF NOT EXISTS agent_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_wd_agent ON agent_withdrawals(agent_id);

-- 1.5 修改现有表（添加列，如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'agent_id') THEN
        ALTER TABLE user_profiles ADD COLUMN agent_id UUID REFERENCES agents(id);
        CREATE INDEX idx_user_profiles_agent ON user_profiles(agent_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'agent_id') THEN
        ALTER TABLE payment_orders ADD COLUMN agent_id UUID REFERENCES agents(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'agent_cost') THEN
        ALTER TABLE payment_orders ADD COLUMN agent_cost NUMERIC(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'agent_profit') THEN
        ALTER TABLE payment_orders ADD COLUMN agent_profit NUMERIC(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_codes' AND column_name = 'agent_id') THEN
        ALTER TABLE redemption_codes ADD COLUMN agent_id UUID REFERENCES agents(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_tiers' AND column_name = 'default_cost_price') THEN
        ALTER TABLE subscription_tiers ADD COLUMN default_cost_price NUMERIC(10,2);
        UPDATE subscription_tiers SET default_cost_price = 10 WHERE id = 'starter';
        UPDATE subscription_tiers SET default_cost_price = 25 WHERE id = 'advanced';
        UPDATE subscription_tiers SET default_cost_price = 50 WHERE id = 'flagship';
        UPDATE subscription_tiers SET default_cost_price = 150 WHERE id = 'studio';
        UPDATE subscription_tiers SET default_cost_price = 650 WHERE id = 'enterprise';
    END IF;
END $$;

-- RPC 函数（使用 CREATE OR REPLACE）
CREATE OR REPLACE FUNCTION process_agent_commission(p_out_trade_no TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_order RECORD; v_agent RECORD; v_pricing RECORD;
    v_profit NUMERIC; v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_order FROM payment_orders
    WHERE out_trade_no = p_out_trade_no AND status = 'paid' AND agent_id IS NOT NULL;
    IF NOT FOUND THEN RETURN '{"success":false,"reason":"no_agent_order"}'::jsonb; END IF;
    IF v_order.agent_profit IS NOT NULL THEN RETURN '{"success":true,"already_processed":true}'::jsonb; END IF;

    SELECT * INTO v_agent FROM agents WHERE id = v_order.agent_id AND status = 'active' FOR UPDATE;
    IF NOT FOUND THEN RETURN '{"success":false,"reason":"agent_not_found"}'::jsonb; END IF;

    SELECT * INTO v_pricing FROM agent_tier_pricing
    WHERE agent_id = v_order.agent_id AND tier_id = v_order.tier_id;
    IF NOT FOUND THEN RETURN '{"success":false,"reason":"pricing_not_found"}'::jsonb; END IF;

    v_profit := v_order.amount - v_pricing.cost_price;
    IF v_profit < 0 THEN v_profit := 0; END IF;

    v_new_balance := v_agent.balance + v_profit;
    UPDATE agents SET balance = v_new_balance WHERE id = v_agent.id;

    INSERT INTO agent_transactions (agent_id, type, amount, balance_after, reference_id, description)
    VALUES (v_agent.id, 'commission', v_profit, v_new_balance, p_out_trade_no,
            '订阅分成: ' || v_order.tier_id || ' 售价' || v_order.amount || ' 成本' || v_pricing.cost_price);

    UPDATE payment_orders SET agent_cost = v_pricing.cost_price, agent_profit = v_profit
    WHERE out_trade_no = p_out_trade_no;

    RETURN jsonb_build_object('success', true, 'profit', v_profit, 'new_balance', v_new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION agent_purchase_redeem_code(
    p_agent_id UUID, p_code TEXT, p_code_type TEXT,
    p_credits_amount INT DEFAULT 0, p_tier_id TEXT DEFAULT NULL,
    p_max_uses INT DEFAULT 1, p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_agent RECORD; v_cost NUMERIC; v_pricing RECORD; v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_agent FROM agents WHERE id = p_agent_id AND status = 'active' FOR UPDATE;
    IF NOT FOUND THEN RETURN '{"success":false,"error":"代理不存在或已禁用"}'::jsonb; END IF;

    IF p_code_type = 'promo' THEN
        IF p_credits_amount <= 0 THEN RETURN '{"success":false,"error":"积分数必须大于0"}'::jsonb; END IF;
        v_cost := (p_credits_amount::NUMERIC / v_agent.credits_rate) * p_max_uses;
    ELSIF p_code_type = 'subscription' THEN
        IF p_tier_id IS NULL THEN RETURN '{"success":false,"error":"订阅码需指定套餐"}'::jsonb; END IF;
        SELECT * INTO v_pricing FROM agent_tier_pricing
        WHERE agent_id = p_agent_id AND tier_id = p_tier_id;
        IF NOT FOUND THEN RETURN '{"success":false,"error":"未找到该套餐定价"}'::jsonb; END IF;
        v_cost := v_pricing.cost_price * p_max_uses;
    ELSE
        RETURN '{"success":false,"error":"无效的兑换码类型"}'::jsonb;
    END IF;

    IF v_agent.balance < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', '余额不足，需要 ' || v_cost || ' 元，当前余额 ' || v_agent.balance || ' 元');
    END IF;

    v_new_balance := v_agent.balance - v_cost;
    UPDATE agents SET balance = v_new_balance WHERE id = v_agent.id;

    INSERT INTO agent_transactions (agent_id, type, amount, balance_after, reference_id, description)
    VALUES (v_agent.id,
            CASE WHEN p_code_type = 'promo' THEN 'credits_purchase' ELSE 'sub_code_purchase' END,
            -v_cost, v_new_balance, p_code,
            CASE WHEN p_code_type = 'promo'
                THEN '购买积分码: ' || p_credits_amount || '积分 x' || p_max_uses
                ELSE '购买订阅码: ' || p_tier_id || ' x' || p_max_uses
            END);

    INSERT INTO redemption_codes (code, code_type, credits_amount, tier_id, max_uses, current_uses, is_active, expires_at, description, created_by, agent_id)
    VALUES (UPPER(p_code), p_code_type, p_credits_amount, p_tier_id, p_max_uses, 0, true, p_expires_at, p_description, 'agent:' || p_agent_id, p_agent_id);

    RETURN jsonb_build_object('success', true, 'cost', v_cost, 'new_balance', v_new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION agent_request_withdrawal(p_agent_id UUID, p_amount NUMERIC)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_agent RECORD; v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_agent FROM agents WHERE id = p_agent_id AND status = 'active' FOR UPDATE;
    IF NOT FOUND THEN RETURN '{"success":false,"error":"代理不存在"}'::jsonb; END IF;
    IF p_amount <= 0 THEN RETURN '{"success":false,"error":"提现金额必须大于0"}'::jsonb; END IF;
    IF v_agent.balance < p_amount THEN RETURN '{"success":false,"error":"余额不足"}'::jsonb; END IF;

    v_new_balance := v_agent.balance - p_amount;
    UPDATE agents SET balance = v_new_balance WHERE id = v_agent.id;

    INSERT INTO agent_withdrawals (agent_id, amount, status) VALUES (v_agent.id, p_amount, 'pending');

    INSERT INTO agent_transactions (agent_id, type, amount, balance_after, description)
    VALUES (v_agent.id, 'withdrawal', -p_amount, v_new_balance, '提现申请: ' || p_amount || '元');

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;
