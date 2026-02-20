-- ============================================================
-- 011: 兑换码支持订阅码类型
-- ============================================================

-- 1. 添加 tier_id 列
ALTER TABLE redemption_codes
ADD COLUMN IF NOT EXISTS tier_id TEXT REFERENCES subscription_tiers(id);

-- 2. 放宽 credits_amount 约束：允许 0（订阅码积分来自套餐）
ALTER TABLE redemption_codes DROP CONSTRAINT IF EXISTS redemption_codes_credits_amount_check;
ALTER TABLE redemption_codes ADD CONSTRAINT redemption_codes_credits_amount_check CHECK (credits_amount >= 0);

-- 3. 扩展 code_type 约束：允许 'subscription'
ALTER TABLE redemption_codes DROP CONSTRAINT IF EXISTS redemption_codes_code_type_check;
ALTER TABLE redemption_codes ADD CONSTRAINT redemption_codes_code_type_check CHECK (code_type IN ('promo', 'new_user', 'subscription'));

-- 4. 添加约束：subscription 类型必须有 tier_id
ALTER TABLE redemption_codes ADD CONSTRAINT redemption_codes_subscription_tier_check
    CHECK (code_type != 'subscription' OR tier_id IS NOT NULL);

-- 5. 替换 redeem_code RPC
CREATE OR REPLACE FUNCTION redeem_code(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_code_row redemption_codes%ROWTYPE;
    v_already_used BOOLEAN;
    v_user_created_at TIMESTAMPTZ;
    v_new_credits INT;
    v_activate_result JSONB;
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

    -- ============ 订阅码分支 ============
    IF v_code_row.code_type = 'subscription' THEN
        -- 调用 activate_subscription 激活订阅（月付）
        SELECT activate_subscription(p_phone, v_code_row.tier_id, 'monthly')
        INTO v_activate_result;

        IF v_activate_result IS NULL OR NOT (v_activate_result->>'success')::boolean THEN
            -- 激活失败，回滚使用次数
            UPDATE redemption_codes
            SET current_uses = current_uses - 1
            WHERE id = v_code_row.id;

            -- 删除兑换记录
            DELETE FROM redemption_records
            WHERE code_id = v_code_row.id AND user_phone = p_phone;

            RETURN jsonb_build_object(
                'success', false,
                'error', '订阅激活失败: ' || COALESCE(v_activate_result->>'reason', '未知错误')
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'type', 'subscription',
            'tier_id', v_code_row.tier_id,
            'credits_granted', (v_activate_result->>'credits_added')::int,
            'remaining_credits', (SELECT credits FROM user_profiles WHERE phone = p_phone),
            'period_end', v_activate_result->>'period_end'
        );
    END IF;

    -- ============ 积分码分支（原有逻辑） ============
    UPDATE user_profiles
    SET credits = credits + v_code_row.credits_amount
    WHERE phone = p_phone
    RETURNING credits INTO v_new_credits;

    IF v_new_credits IS NULL THEN
        RAISE EXCEPTION '用户不存在';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'type', 'credits',
        'credits_granted', v_code_row.credits_amount,
        'remaining_credits', v_new_credits
    );
END;
$$;
