-- ============================================================
-- 008: 邀请返利系统
-- ============================================================

-- 1. 邀请码表
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_phone TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- 2. 邀请奖励记录表
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_phone TEXT NOT NULL,
    referee_phone TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('signup', 'commission')),
    credits_amount INT NOT NULL,
    order_out_trade_no TEXT,
    purchase_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_phone);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referee ON referral_rewards(referee_phone);

-- 3. user_profiles 增加 referred_by 字段
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- ============================================================
-- RPC: generate_referral_code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_referral_code(p_phone TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
    v_attempts INT := 0;
BEGIN
    -- 已有码则直接返回
    SELECT code INTO v_code FROM referral_codes WHERE user_phone = p_phone;
    IF v_code IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'code', v_code);
    END IF;

    -- PLACEHOLDER_GENERATE_LOOP
    LOOP
        v_attempts := v_attempts + 1;
        v_code := UPPER(SUBSTRING(MD5(p_phone || NOW()::TEXT || v_attempts::TEXT || RANDOM()::TEXT) FROM 1 FOR 8));

        SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = v_code) INTO v_exists;
        EXIT WHEN NOT v_exists OR v_attempts > 10;
    END LOOP;

    IF v_exists THEN
        RETURN jsonb_build_object('success', false, 'error', '生成邀请码失败，请重试');
    END IF;

    INSERT INTO referral_codes (user_phone, code) VALUES (p_phone, v_code);
    RETURN jsonb_build_object('success', true, 'code', v_code);
END;
$$;

-- ============================================================
-- RPC: apply_referral_code
-- ============================================================
CREATE OR REPLACE FUNCTION apply_referral_code(p_referee_phone TEXT, p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_referrer_phone TEXT;
    v_referred_by TEXT;
    v_referee_credits INT;
    v_referrer_credits INT;
BEGIN
    -- 查找邀请码对应的邀请人
    SELECT user_phone INTO v_referrer_phone FROM referral_codes WHERE code = UPPER(p_code);
    IF v_referrer_phone IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '邀请码无效');
    END IF;

    -- 不能自邀
    IF v_referrer_phone = p_referee_phone THEN
        RETURN jsonb_build_object('success', false, 'error', '不能使用自己的邀请码');
    END IF;

    -- 检查是否已被邀请
    SELECT referred_by INTO v_referred_by FROM user_profiles WHERE phone = p_referee_phone FOR UPDATE;
    IF v_referred_by IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '您已使用过邀请码');
    END IF;

    -- 设置邀请关系
    UPDATE user_profiles SET referred_by = v_referrer_phone WHERE phone = p_referee_phone;

    -- 双方各 +100 积分
    UPDATE user_profiles SET credits = credits + 100 WHERE phone = p_referee_phone
        RETURNING credits INTO v_referee_credits;
    UPDATE user_profiles SET credits = credits + 100 WHERE phone = v_referrer_phone
        RETURNING credits INTO v_referrer_credits;

    -- 插入奖励记录（仅记录邀请人的奖励，被邀请人的积分已通过上方 UPDATE 发放）
    INSERT INTO referral_rewards (referrer_phone, referee_phone, reward_type, credits_amount)
    VALUES (v_referrer_phone, p_referee_phone, 'signup', 100);

    RETURN jsonb_build_object(
        'success', true,
        'referrer_phone', v_referrer_phone,
        'referee_credits', v_referee_credits,
        'referrer_credits', v_referrer_credits
    );
END;
$$;

-- ============================================================
-- RPC: grant_referral_commission
-- ============================================================
CREATE OR REPLACE FUNCTION grant_referral_commission(p_order_out_trade_no TEXT, p_credits_received INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_buyer_phone TEXT;
    v_tier_id TEXT;
    v_referrer_phone TEXT;
    v_commission_count INT;
    v_commission INT;
    v_purchase_count INT;
    v_referrer_credits INT;
BEGIN
    -- 查询订单
    SELECT user_phone, tier_id INTO v_buyer_phone, v_tier_id
    FROM payment_orders WHERE out_trade_no = p_order_out_trade_no AND status = 'paid';
    IF v_buyer_phone IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '订单不存在');
    END IF;

    -- 企业版不参与
    IF v_tier_id = 'enterprise' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'enterprise_excluded');
    END IF;

    -- 查找邀请人
    SELECT referred_by INTO v_referrer_phone FROM user_profiles WHERE phone = v_buyer_phone;
    IF v_referrer_phone IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_referrer');
    END IF;

    -- 检查佣金次数（限前3次）
    SELECT COUNT(*) INTO v_commission_count
    FROM referral_rewards
    WHERE referrer_phone = v_referrer_phone AND referee_phone = v_buyer_phone AND reward_type = 'commission';
    IF v_commission_count >= 3 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'commission_limit_reached');
    END IF;

    -- 防重复：同一订单不重复发放
    IF EXISTS (SELECT 1 FROM referral_rewards WHERE order_out_trade_no = p_order_out_trade_no) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_granted');
    END IF;

    -- 计算佣金 10%
    v_commission := FLOOR(p_credits_received * 0.1);
    v_purchase_count := v_commission_count + 1;

    -- 发放佣金
    UPDATE user_profiles SET credits = credits + v_commission WHERE phone = v_referrer_phone
        RETURNING credits INTO v_referrer_credits;

    -- 记录
    INSERT INTO referral_rewards (referrer_phone, referee_phone, reward_type, credits_amount, order_out_trade_no, purchase_count)
    VALUES (v_referrer_phone, v_buyer_phone, 'commission', v_commission, p_order_out_trade_no, v_purchase_count);

    RETURN jsonb_build_object(
        'success', true,
        'commission', v_commission,
        'purchase_count', v_purchase_count,
        'referrer_credits', v_referrer_credits
    );
END;
$$;

-- Enable Realtime for referral tables (optional, for admin monitoring)
ALTER TABLE referral_rewards REPLICA IDENTITY FULL;
