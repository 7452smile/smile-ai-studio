-- ============================================================
-- 009: 兑换码系统
-- ============================================================

-- 1. 兑换码表
CREATE TABLE IF NOT EXISTS redemption_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    credits_amount INT NOT NULL CHECK (credits_amount > 0),
    max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses > 0),
    current_uses INT NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
    description TEXT,
    code_type TEXT NOT NULL DEFAULT 'promo' CHECK (code_type IN ('promo', 'new_user')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 兑换记录表
CREATE TABLE IF NOT EXISTS redemption_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_id UUID NOT NULL REFERENCES redemption_codes(id),
    code TEXT NOT NULL,
    user_phone TEXT NOT NULL,
    credits_amount INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_phone, code_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_active ON redemption_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_redemption_records_user ON redemption_records(user_phone);
CREATE INDEX IF NOT EXISTS idx_redemption_records_code_id ON redemption_records(code_id);

-- 3. RPC: 兑换码原子操作
CREATE OR REPLACE FUNCTION redeem_code(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_code_row redemption_codes%ROWTYPE;
    v_already_used BOOLEAN;
    v_user_created_at TIMESTAMPTZ;
    v_new_credits INT;
BEGIN
    -- 锁定兑换码行
    SELECT * INTO v_code_row
    FROM redemption_codes
    WHERE code = UPPER(TRIM(p_code))
    FOR UPDATE;

    -- 码不存在
    IF v_code_row IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '兑换码不存在');
    END IF;

    -- 是否启用
    IF NOT v_code_row.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', '该兑换码已被禁用');
    END IF;

    -- 是否过期
    IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', '该兑换码已过期');
    END IF;

    -- 是否用完
    IF v_code_row.current_uses >= v_code_row.max_uses THEN
        RETURN jsonb_build_object('success', false, 'error', '该兑换码已被使用完毕');
    END IF;

    -- 是否已兑换过
    SELECT EXISTS(
        SELECT 1 FROM redemption_records
        WHERE user_phone = p_phone AND code_id = v_code_row.id
    ) INTO v_already_used;

    IF v_already_used THEN
        RETURN jsonb_build_object('success', false, 'error', '您已使用过该兑换码');
    END IF;

    -- 新用户码检查：注册7天内
    IF v_code_row.code_type = 'new_user' THEN
        SELECT created_at INTO v_user_created_at
        FROM user_profiles
        WHERE phone = p_phone;

        IF v_user_created_at IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', '用户不存在');
        END IF;

        IF v_user_created_at < now() - INTERVAL '7 days' THEN
            RETURN jsonb_build_object('success', false, 'error', '该兑换码仅限新用户使用（注册7天内）');
        END IF;
    END IF;

    -- 更新使用次数
    UPDATE redemption_codes
    SET current_uses = current_uses + 1
    WHERE id = v_code_row.id;

    -- 插入兑换记录
    INSERT INTO redemption_records (code_id, code, user_phone, credits_amount)
    VALUES (v_code_row.id, v_code_row.code, p_phone, v_code_row.credits_amount);

    -- 增加用户积分
    UPDATE user_profiles
    SET credits = credits + v_code_row.credits_amount
    WHERE phone = p_phone
    RETURNING credits INTO v_new_credits;

    IF v_new_credits IS NULL THEN
        RAISE EXCEPTION '用户不存在';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'credits_granted', v_code_row.credits_amount,
        'remaining_credits', v_new_credits
    );
END;
$$;
