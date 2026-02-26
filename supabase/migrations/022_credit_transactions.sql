-- ============================================================
-- 022: 积分流水明细表 + 重写RPC函数加流水记录 + 删除每日赠送
-- ============================================================

-- 1. 建表
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    transaction_type TEXT NOT NULL,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user_created
    ON credit_transactions(user_id, created_at DESC);

-- 2. 启用 RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions"
    ON credit_transactions FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access on credit_transactions" ON credit_transactions;
CREATE POLICY "Service role full access on credit_transactions"
    ON credit_transactions FOR ALL
    USING (auth.role() = 'service_role');

-- 3. 重写 deduct_user_credits_v2 — 先DROP旧签名，再创建新版本
DROP FUNCTION IF EXISTS deduct_user_credits_v2(UUID, INT);
CREATE OR REPLACE FUNCTION deduct_user_credits_v2(
    p_user_id UUID,
    p_amount INT,
    p_reference_id TEXT DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'generation'
) RETURNS INT AS $$
DECLARE
    v_current INT;
    v_new INT;
BEGIN
    SELECT credits INTO v_current
    FROM user_profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current IS NULL OR v_current < p_amount THEN
        RETURN -1;
    END IF;

    v_new := v_current - p_amount;

    UPDATE user_profiles SET credits = v_new WHERE id = p_user_id;

    INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, reference_id)
    VALUES (p_user_id, p_tx_type, -p_amount, v_new, p_reference_id);

    RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 重写 refund_user_credits_v2 — 先DROP旧签名，再创建新版本
DROP FUNCTION IF EXISTS refund_user_credits_v2(UUID, INT);
CREATE OR REPLACE FUNCTION refund_user_credits_v2(
    p_user_id UUID,
    p_amount INT,
    p_reference_id TEXT DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'refund'
) RETURNS INT AS $$
DECLARE
    v_new INT;
BEGIN
    UPDATE user_profiles
    SET credits = credits + p_amount
    WHERE id = p_user_id
    RETURNING credits INTO v_new;

    INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, reference_id)
    VALUES (p_user_id, p_tx_type, p_amount, v_new, p_reference_id);

    RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 重写 activate_subscription_v2 — 保持原签名(3参数)，加流水记录
CREATE OR REPLACE FUNCTION activate_subscription_v2(p_user_id UUID, p_tier_id TEXT, p_billing_cycle TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_monthly_credits INT; v_period_end TIMESTAMPTZ; v_credits_to_add INT;
    v_phone TEXT;
    v_new_balance INT;
BEGIN
    SELECT monthly_credits INTO v_monthly_credits FROM subscription_tiers WHERE id = p_tier_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', '套餐不存在');
    END IF;

    v_phone := _get_phone_by_id(p_user_id);

    IF p_billing_cycle = 'annual' THEN
        v_period_end := NOW() + INTERVAL '1 year';
        v_credits_to_add := v_monthly_credits * 12;
    ELSE
        v_period_end := NOW() + INTERVAL '1 month';
        v_credits_to_add := v_monthly_credits;
    END IF;

    UPDATE user_subscriptions SET status = 'cancelled'
    WHERE (user_id = p_user_id OR user_phone = v_phone) AND status = 'active';

    INSERT INTO user_subscriptions (user_id, user_phone, tier_id, billing_cycle, status, period_start, period_end)
    VALUES (p_user_id, v_phone, p_tier_id, p_billing_cycle, 'active', NOW(), v_period_end);

    UPDATE user_profiles SET subscription_tier = p_tier_id, credits = credits + v_credits_to_add
    WHERE id = p_user_id
    RETURNING credits INTO v_new_balance;

    -- 流水记录
    INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description)
    VALUES (p_user_id, 'subscription', v_credits_to_add, v_new_balance, p_tier_id || '/' || p_billing_cycle);

    RETURN jsonb_build_object('success', true, 'credits_added', v_credits_to_add, 'period_end', v_period_end);
END;
$$;

-- 6. 重写 apply_referral_code_v2 — 保持原逻辑，加流水记录
CREATE OR REPLACE FUNCTION apply_referral_code_v2(p_referee_id UUID, p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_referrer_id UUID; v_referrer_phone TEXT;
    v_referred_by_id UUID; v_referee_credits INT; v_referrer_credits INT;
BEGIN
    SELECT user_id, user_phone INTO v_referrer_id, v_referrer_phone
    FROM referral_codes WHERE code = UPPER(p_code);
    IF v_referrer_id IS NULL AND v_referrer_phone IS NOT NULL THEN
        SELECT id INTO v_referrer_id FROM user_profiles WHERE phone = v_referrer_phone;
    END IF;
    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '邀请码无效');
    END IF;

    IF v_referrer_id = p_referee_id THEN
        RETURN jsonb_build_object('success', false, 'error', '不能使用自己的邀请码');
    END IF;

    SELECT referred_by_id INTO v_referred_by_id FROM user_profiles WHERE id = p_referee_id FOR UPDATE;
    IF v_referred_by_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '您已使用过邀请码');
    END IF;

    UPDATE user_profiles SET referred_by = _get_phone_by_id(v_referrer_id), referred_by_id = v_referrer_id
    WHERE id = p_referee_id;

    UPDATE user_profiles SET credits = credits + 100 WHERE id = p_referee_id
        RETURNING credits INTO v_referee_credits;
    UPDATE user_profiles SET credits = credits + 100 WHERE id = v_referrer_id
        RETURNING credits INTO v_referrer_credits;

    INSERT INTO referral_rewards (referrer_id, referee_id, referrer_phone, referee_phone, reward_type, credits_amount)
    VALUES (v_referrer_id, p_referee_id, _get_phone_by_id(v_referrer_id), _get_phone_by_id(p_referee_id), 'signup', 100);

    -- 流水记录
    INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, reference_id)
    VALUES (p_referee_id, 'referral_signup', 100, v_referee_credits, 'referral signup bonus', p_code);
    INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, reference_id)
    VALUES (v_referrer_id, 'referral_signup', 100, v_referrer_credits, 'referral signup bonus', p_code);

    RETURN jsonb_build_object(
        'success', true,
        'referrer_id', v_referrer_id,
        'referee_credits', v_referee_credits,
        'referrer_credits', v_referrer_credits
    );
END;
$$;

-- 7. 重写 redeem_code_v2 — 保持原逻辑，加流水记录（仅积分码分支）
CREATE OR REPLACE FUNCTION redeem_code_v2(p_user_id UUID, p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_code_row redemption_codes%ROWTYPE;
    v_already_used BOOLEAN;
    v_user_created_at TIMESTAMPTZ;
    v_new_credits INT;
    v_activate_result JSONB;
    v_phone TEXT;
BEGIN
    v_phone := _get_phone_by_id(p_user_id);

    SELECT * INTO v_code_row FROM redemption_codes
    WHERE code = UPPER(TRIM(p_code)) FOR UPDATE;

    IF v_code_row IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '兑换码不存在');
    END IF;
    IF NOT v_code_row.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', '该兑换码已被禁用');
    END IF;
    IF v_code_row.expires_at IS NOT NULL AND v_code_row.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', '该兑换码已过期');
    END IF;
    IF v_code_row.current_uses >= v_code_row.max_uses THEN
        RETURN jsonb_build_object('success', false, 'error', '该兑换码已被使用完毕');
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM redemption_records
        WHERE (user_id = p_user_id OR user_phone = v_phone) AND code_id = v_code_row.id
    ) INTO v_already_used;

    IF v_already_used THEN
        RETURN jsonb_build_object('success', false, 'error', '您已使用过该兑换码');
    END IF;

    IF v_code_row.code_type = 'new_user' THEN
        SELECT created_at INTO v_user_created_at FROM user_profiles WHERE id = p_user_id;
        IF v_user_created_at IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', '用户不存在');
        END IF;
        IF v_user_created_at < now() - INTERVAL '7 days' THEN
            RETURN jsonb_build_object('success', false, 'error', '该兑换码仅限新用户使用（注册7天内）');
        END IF;
    END IF;

    UPDATE redemption_codes SET current_uses = current_uses + 1 WHERE id = v_code_row.id;

    INSERT INTO redemption_records (code_id, code, user_id, user_phone, credits_amount)
    VALUES (v_code_row.id, v_code_row.code, p_user_id, v_phone, v_code_row.credits_amount);

    -- 订阅码分支
    IF v_code_row.code_type = 'subscription' THEN
        SELECT activate_subscription_v2(p_user_id, v_code_row.tier_id, 'monthly')
        INTO v_activate_result;

        IF v_activate_result IS NULL OR NOT (v_activate_result->>'success')::boolean THEN
            UPDATE redemption_codes SET current_uses = current_uses - 1 WHERE id = v_code_row.id;
            DELETE FROM redemption_records WHERE code_id = v_code_row.id AND user_id = p_user_id;
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
            'remaining_credits', (SELECT credits FROM user_profiles WHERE id = p_user_id),
            'period_end', v_activate_result->>'period_end'
        );
    END IF;

    -- 积分码分支
    UPDATE user_profiles SET credits = credits + v_code_row.credits_amount
    WHERE id = p_user_id RETURNING credits INTO v_new_credits;

    IF v_new_credits IS NULL THEN
        RAISE EXCEPTION '用户不存在';
    END IF;

    -- 流水记录
    INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, reference_id)
    VALUES (p_user_id, 'redemption', v_code_row.credits_amount, v_new_credits, v_code_row.description, v_code_row.code);

    RETURN jsonb_build_object(
        'success', true,
        'type', 'credits',
        'credits_granted', v_code_row.credits_amount,
        'remaining_credits', v_new_credits
    );
END;
$$;

-- 8. 重写 grant_referral_commission_v2 — 加流水记录（保持原签名）
CREATE OR REPLACE FUNCTION grant_referral_commission_v2(p_order_out_trade_no TEXT, p_credits_received INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_buyer_id UUID; v_buyer_phone TEXT;
    v_tier_id TEXT;
    v_referrer_id UUID;
    v_commission_count INT;
    v_commission INT;
    v_purchase_count INT;
    v_referrer_credits INT;
BEGIN
    SELECT user_id, user_phone, tier_id INTO v_buyer_id, v_buyer_phone, v_tier_id
    FROM payment_orders WHERE out_trade_no = p_order_out_trade_no AND status = 'paid';
    IF v_buyer_phone IS NULL AND v_buyer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '订单不存在');
    END IF;

    IF v_buyer_id IS NULL THEN
        SELECT id INTO v_buyer_id FROM user_profiles WHERE phone = v_buyer_phone;
    END IF;

    IF v_tier_id = 'enterprise' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'enterprise_excluded');
    END IF;

    SELECT referred_by_id INTO v_referrer_id FROM user_profiles WHERE id = v_buyer_id;
    IF v_referrer_id IS NULL THEN
        SELECT up2.id INTO v_referrer_id
        FROM user_profiles up1
        JOIN user_profiles up2 ON up1.referred_by = up2.phone
        WHERE up1.id = v_buyer_id;
    END IF;
    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_referrer');
    END IF;

    SELECT COUNT(*) INTO v_commission_count
    FROM referral_rewards
    WHERE (referrer_id = v_referrer_id OR referrer_phone = _get_phone_by_id(v_referrer_id))
      AND (referee_id = v_buyer_id OR referee_phone = _get_phone_by_id(v_buyer_id))
      AND reward_type = 'commission';
    IF v_commission_count >= 3 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'commission_limit_reached');
    END IF;

    IF EXISTS (SELECT 1 FROM referral_rewards WHERE order_out_trade_no = p_order_out_trade_no) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_granted');
    END IF;

    v_commission := FLOOR(p_credits_received * 0.1);
    v_purchase_count := v_commission_count + 1;

    UPDATE user_profiles SET credits = credits + v_commission WHERE id = v_referrer_id
        RETURNING credits INTO v_referrer_credits;

    INSERT INTO referral_rewards (referrer_id, referee_id, referrer_phone, referee_phone, reward_type, credits_amount, order_out_trade_no, purchase_count)
    VALUES (v_referrer_id, v_buyer_id, _get_phone_by_id(v_referrer_id), _get_phone_by_id(v_buyer_id), 'commission', v_commission, p_order_out_trade_no, v_purchase_count);

    -- 流水记录
    INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, reference_id)
    VALUES (v_referrer_id, 'referral_commission', v_commission, v_referrer_credits, 'commission #' || v_purchase_count, p_order_out_trade_no);

    RETURN jsonb_build_object(
        'success', true,
        'commission', v_commission,
        'purchase_count', v_purchase_count,
        'referrer_credits', v_referrer_credits
    );
END;
$$;

-- 9. 删除每日赠送函数
DROP FUNCTION IF EXISTS grant_daily_credits_v2(UUID);

-- 10. 启用 Realtime（可选，用于前端实时更新）
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE credit_transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
