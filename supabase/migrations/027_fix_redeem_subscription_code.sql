-- ============================================================
-- 027: 修复兑换码系统 - 支持订阅码
-- ============================================================

CREATE OR REPLACE FUNCTION redeem_code(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_code_row redemption_codes%ROWTYPE;
    v_already_used BOOLEAN;
    v_user_created_at TIMESTAMPTZ;
    v_user_id UUID;
    v_new_credits INT;
    v_period_end TIMESTAMPTZ;
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

    -- 码已停用
    IF NOT v_code_row.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', '兑换码已停用');
    END IF;

    -- 码已过期
    IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', '兑换码已过期');
    END IF;

    -- 使用次数已达上限
    IF v_code_row.current_uses >= v_code_row.max_uses THEN
        RETURN jsonb_build_object('success', false, 'error', '兑换码已达使用上限');
    END IF;

    -- 获取用户信息
    SELECT id, created_at INTO v_user_id, v_user_created_at
    FROM user_profiles
    WHERE phone = p_phone;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    -- 检查是否已使用
    SELECT EXISTS(
        SELECT 1 FROM redemption_records
        WHERE code_id = v_code_row.id AND user_id = v_user_id
    ) INTO v_already_used;

    IF v_already_used THEN
        RETURN jsonb_build_object('success', false, 'error', '您已使用过该兑换码');
    END IF;

    -- 新用户码检查：注册7天内
    IF v_code_row.code_type = 'new_user' THEN
        IF v_user_created_at < now() - INTERVAL '7 days' THEN
            RETURN jsonb_build_object('success', false, 'error', '该兑换码仅限新用户使用（注册7天内）');
        END IF;
    END IF;

    -- 更新使用次数
    UPDATE redemption_codes
    SET current_uses = current_uses + 1
    WHERE id = v_code_row.id;

    -- 处理不同类型的兑换码
    IF v_code_row.code_type = 'subscription' THEN
        -- 订阅码：激活订阅
        IF v_code_row.tier_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', '订阅码配置错误：缺少套餐ID');
        END IF;

        -- 计算订阅结束时间（30天）
        v_period_end := now() + INTERVAL '30 days';

        -- 插入或更新订阅
        INSERT INTO user_subscriptions (user_id, tier_id, period_start, period_end, is_active)
        VALUES (v_user_id, v_code_row.tier_id, now(), v_period_end, true)
        ON CONFLICT (user_id) DO UPDATE
        SET tier_id = EXCLUDED.tier_id,
            period_start = EXCLUDED.period_start,
            period_end = EXCLUDED.period_end,
            is_active = true;

        -- 插入兑换记录
        INSERT INTO redemption_records (code_id, code, user_id, user_phone, credits_amount, tier_id)
        VALUES (v_code_row.id, v_code_row.code, v_user_id, p_phone, 0, v_code_row.tier_id);

        RETURN jsonb_build_object(
            'success', true,
            'type', 'subscription',
            'tier_id', v_code_row.tier_id,
            'period_end', v_period_end
        );
    ELSE
        -- 积分码：增加积分
        INSERT INTO redemption_records (code_id, code, user_id, user_phone, credits_amount)
        VALUES (v_code_row.id, v_code_row.code, v_user_id, p_phone, v_code_row.credits_amount);

        UPDATE user_profiles
        SET credits = credits + v_code_row.credits_amount
        WHERE id = v_user_id
        RETURNING credits INTO v_new_credits;

        RETURN jsonb_build_object(
            'success', true,
            'type', 'credits',
            'credits_granted', v_code_row.credits_amount,
            'remaining_credits', v_new_credits
        );
    END IF;
END;
$$;

-- 修改 redemption_records 表，添加 user_id 和 tier_id 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'redemption_records' AND column_name = 'user_id') THEN
        ALTER TABLE redemption_records ADD COLUMN user_id UUID REFERENCES user_profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'redemption_records' AND column_name = 'tier_id') THEN
        ALTER TABLE redemption_records ADD COLUMN tier_id TEXT;
    END IF;
END $$;
