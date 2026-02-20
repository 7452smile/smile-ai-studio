-- ============================================================
-- 012: 用户标识迁移 user_phone → user_id (UUID)
-- 只加不删，先兼容后清理
-- ============================================================

-- ============================================================
-- Phase 1A: 给业务表新增 user_id UUID 列 + 回填 + 索引
-- ============================================================

-- 1. generation_tasks
ALTER TABLE generation_tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);
UPDATE generation_tasks SET user_id = up.id
FROM user_profiles up WHERE generation_tasks.user_phone = up.phone AND generation_tasks.user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON generation_tasks(user_id);

-- 2. payment_orders
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);
UPDATE payment_orders SET user_id = up.id
FROM user_profiles up WHERE payment_orders.user_phone = up.phone AND payment_orders.user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);

-- 3. user_subscriptions
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);
UPDATE user_subscriptions SET user_id = up.id
FROM user_profiles up WHERE user_subscriptions.user_phone = up.phone AND user_subscriptions.user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- 4. referral_codes
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);
UPDATE referral_codes SET user_id = up.id
FROM user_profiles up WHERE referral_codes.user_phone = up.phone AND referral_codes.user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);

-- 5. referral_rewards: referrer_id + referee_id
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES user_profiles(id);
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS referee_id UUID REFERENCES user_profiles(id);
UPDATE referral_rewards SET referrer_id = up.id
FROM user_profiles up WHERE referral_rewards.referrer_phone = up.phone AND referral_rewards.referrer_id IS NULL;
UPDATE referral_rewards SET referee_id = up.id
FROM user_profiles up WHERE referral_rewards.referee_phone = up.phone AND referral_rewards.referee_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referee_id ON referral_rewards(referee_id);

-- 6. redemption_records
ALTER TABLE redemption_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);
UPDATE redemption_records SET user_id = up.id
FROM user_profiles up WHERE redemption_records.user_phone = up.phone AND redemption_records.user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_redemption_records_user_id ON redemption_records(user_id);

-- 7. failed_refunds
ALTER TABLE failed_refunds ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);
UPDATE failed_refunds SET user_id = up.id
FROM user_profiles up WHERE failed_refunds.user_phone = up.phone AND failed_refunds.user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_failed_refunds_user_id ON failed_refunds(user_id);

-- 8. user_profiles.referred_by_id (自引用)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES user_profiles(id);
UPDATE user_profiles SET referred_by_id = ref.id
FROM user_profiles ref WHERE user_profiles.referred_by = ref.phone AND user_profiles.referred_by_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by_id ON user_profiles(referred_by_id);


-- ============================================================
-- Phase 1B: _v2 RPC 函数（接受 UUID 而非 phone）
-- 写入时同时写 user_id 和 user_phone（通过查 user_profiles 获取 phone）
-- ============================================================

-- 辅助函数：根据 user_id 查 phone
CREATE OR REPLACE FUNCTION _get_phone_by_id(p_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE v_phone TEXT;
BEGIN
    SELECT phone INTO v_phone FROM user_profiles WHERE id = p_user_id;
    RETURN v_phone;
END;
$$;

-- ---------------------------------------------------------
-- deduct_user_credits_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_user_credits_v2(p_user_id UUID, p_amount INT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_current INT;
BEGIN
    SELECT credits INTO v_current FROM user_profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN -1; END IF;
    IF v_current < p_amount THEN RETURN -1; END IF;
    UPDATE user_profiles SET credits = credits - p_amount WHERE id = p_user_id;
    RETURN v_current - p_amount;
END;
$$;

-- ---------------------------------------------------------
-- refund_user_credits_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION refund_user_credits_v2(p_user_id UUID, p_amount INT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_new INT;
BEGIN
    UPDATE user_profiles SET credits = credits + p_amount WHERE id = p_user_id
    RETURNING credits INTO v_new;
    IF NOT FOUND THEN RETURN -1; END IF;
    RETURN v_new;
END;
$$;

-- ---------------------------------------------------------
-- get_user_credits_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_credits_v2(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_credits INT;
BEGIN
    SELECT credits INTO v_credits FROM user_profiles WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN -1; END IF;
    RETURN v_credits;
END;
$$;

-- ---------------------------------------------------------
-- check_concurrency_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION check_concurrency_v2(p_user_id UUID, p_task_type TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_tier TEXT;
    v_max_image INT; v_max_video INT; v_max_total INT;
    v_current_image INT; v_current_video INT; v_current_total INT;
BEGIN
    SELECT subscription_tier INTO v_tier FROM user_profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'reason', '用户不存在');
    END IF;

    SELECT max_concurrent_image, max_concurrent_video, max_concurrent_total
    INTO v_max_image, v_max_video, v_max_total
    FROM subscription_tiers WHERE id = v_tier;

    -- 同时兼容 user_id 和 user_phone 查询正在进行的任务
    SELECT
        COUNT(*) FILTER (WHERE task_type = 'image'),
        COUNT(*) FILTER (WHERE task_type = 'video'),
        COUNT(*)
    INTO v_current_image, v_current_video, v_current_total
    FROM generation_tasks
    WHERE (user_id = p_user_id OR user_phone = _get_phone_by_id(p_user_id))
      AND status = 'processing';

    IF v_max_total IS NOT NULL THEN
        IF v_current_total >= v_max_total THEN
            RETURN jsonb_build_object('allowed', false, 'reason',
                '免费版同时只能进行 ' || v_max_total || ' 个任务，请等待当前任务完成',
                'tier', v_tier);
        END IF;
        RETURN jsonb_build_object('allowed', true, 'tier', v_tier);
    END IF;

    IF p_task_type = 'image' AND v_current_image >= v_max_image THEN
        RETURN jsonb_build_object('allowed', false, 'reason',
            '当前套餐最多同时进行 ' || v_max_image || ' 个图片任务', 'tier', v_tier);
    END IF;

    IF p_task_type = 'video' AND v_current_video >= v_max_video THEN
        RETURN jsonb_build_object('allowed', false, 'reason',
            '当前套餐最多同时进行 ' || v_max_video || ' 个视频任务', 'tier', v_tier);
    END IF;

    RETURN jsonb_build_object('allowed', true, 'tier', v_tier);
END;
$$;

-- ---------------------------------------------------------
-- grant_daily_credits_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION grant_daily_credits_v2(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_tier TEXT; v_credits INT; v_last_daily TIMESTAMPTZ;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT subscription_tier, credits, last_daily_credit_at
    INTO v_tier, v_credits, v_last_daily
    FROM user_profiles WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', '用户不存在');
    END IF;

    IF v_tier != 'free' THEN
        RETURN jsonb_build_object('success', false, 'reason', '付费用户无需每日积分');
    END IF;

    IF v_last_daily IS NOT NULL AND v_last_daily::date = v_today THEN
        RETURN jsonb_build_object('success', false, 'reason', '今日已领取');
    END IF;

    IF v_credits >= 200 THEN
        RETURN jsonb_build_object('success', false, 'reason', '积分已达上限200');
    END IF;

    UPDATE user_profiles
    SET credits = LEAST(credits + 10, 200), last_daily_credit_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'granted', LEAST(10, 200 - v_credits), 'credits', LEAST(v_credits + 10, 200));
END;
$$;

-- ---------------------------------------------------------
-- activate_subscription_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION activate_subscription_v2(p_user_id UUID, p_tier_id TEXT, p_billing_cycle TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_monthly_credits INT; v_period_end TIMESTAMPTZ; v_credits_to_add INT;
    v_phone TEXT;
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

    -- 取消旧订阅（兼容两种标识）
    UPDATE user_subscriptions SET status = 'cancelled'
    WHERE (user_id = p_user_id OR user_phone = v_phone) AND status = 'active';

    -- 新订阅同时写 user_id 和 user_phone
    INSERT INTO user_subscriptions (user_id, user_phone, tier_id, billing_cycle, status, period_start, period_end)
    VALUES (p_user_id, v_phone, p_tier_id, p_billing_cycle, 'active', NOW(), v_period_end);

    UPDATE user_profiles SET subscription_tier = p_tier_id, credits = credits + v_credits_to_add
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'credits_added', v_credits_to_add, 'period_end', v_period_end);
END;
$$;

-- ---------------------------------------------------------
-- generate_referral_code_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_referral_code_v2(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_code TEXT; v_exists BOOLEAN; v_attempts INT := 0;
    v_phone TEXT;
BEGIN
    v_phone := _get_phone_by_id(p_user_id);

    -- 已有码（按 user_id 或 user_phone 查）
    SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id OR user_phone = v_phone;
    IF v_code IS NOT NULL THEN
        -- 确保 user_id 列已填
        UPDATE referral_codes SET user_id = p_user_id WHERE user_phone = v_phone AND user_id IS NULL;
        RETURN jsonb_build_object('success', true, 'code', v_code);
    END IF;

    LOOP
        v_attempts := v_attempts + 1;
        v_code := UPPER(SUBSTRING(MD5(p_user_id::TEXT || NOW()::TEXT || v_attempts::TEXT || RANDOM()::TEXT) FROM 1 FOR 8));
        SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = v_code) INTO v_exists;
        EXIT WHEN NOT v_exists OR v_attempts > 10;
    END LOOP;

    IF v_exists THEN
        RETURN jsonb_build_object('success', false, 'error', '生成邀请码失败，请重试');
    END IF;

    INSERT INTO referral_codes (user_id, user_phone, code) VALUES (p_user_id, v_phone, v_code);
    RETURN jsonb_build_object('success', true, 'code', v_code);
END;
$$;

-- ---------------------------------------------------------
-- apply_referral_code_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_referral_code_v2(p_referee_id UUID, p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_referrer_id UUID; v_referrer_phone TEXT;
    v_referred_by_id UUID; v_referee_credits INT; v_referrer_credits INT;
BEGIN
    -- 查找邀请码对应的邀请人
    SELECT user_id, user_phone INTO v_referrer_id, v_referrer_phone
    FROM referral_codes WHERE code = UPPER(p_code);
    IF v_referrer_id IS NULL AND v_referrer_phone IS NOT NULL THEN
        -- 旧数据没有 user_id，通过 phone 查
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

    -- 设置邀请关系（同时写 referred_by 和 referred_by_id）
    UPDATE user_profiles SET referred_by = _get_phone_by_id(v_referrer_id), referred_by_id = v_referrer_id
    WHERE id = p_referee_id;

    UPDATE user_profiles SET credits = credits + 100 WHERE id = p_referee_id
        RETURNING credits INTO v_referee_credits;
    UPDATE user_profiles SET credits = credits + 100 WHERE id = v_referrer_id
        RETURNING credits INTO v_referrer_credits;

    INSERT INTO referral_rewards (referrer_id, referee_id, referrer_phone, referee_phone, reward_type, credits_amount)
    VALUES (v_referrer_id, p_referee_id, _get_phone_by_id(v_referrer_id), _get_phone_by_id(p_referee_id), 'signup', 100);

    RETURN jsonb_build_object(
        'success', true,
        'referrer_id', v_referrer_id,
        'referee_credits', v_referee_credits,
        'referrer_credits', v_referrer_credits
    );
END;
$$;

-- ---------------------------------------------------------
-- redeem_code_v2
-- ---------------------------------------------------------
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

    -- 兼容检查：同时检查 user_id 和 user_phone
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

    -- 同时写 user_id 和 user_phone
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

    RETURN jsonb_build_object(
        'success', true,
        'type', 'credits',
        'credits_granted', v_code_row.credits_amount,
        'remaining_credits', v_new_credits
    );
END;
$$;

-- ---------------------------------------------------------
-- log_failed_refund_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION log_failed_refund_v2(
    p_user_id UUID,
    p_amount INTEGER,
    p_task_id UUID DEFAULT NULL,
    p_source TEXT DEFAULT 'webhook',
    p_reason TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO failed_refunds (user_id, user_phone, amount, task_id, source, reason)
    VALUES (p_user_id, _get_phone_by_id(p_user_id), p_amount, p_task_id, p_source, p_reason);
END;
$$;

-- ---------------------------------------------------------
-- safe_process_payment_v2
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION safe_process_payment_v2(
    p_out_trade_no TEXT,
    p_trade_no TEXT,
    p_pay_type TEXT,
    p_money NUMERIC,
    p_notify_data JSONB
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_order RECORD;
    v_activate_result JSONB;
    v_user_id UUID;
BEGIN
    SELECT * INTO v_order FROM payment_orders
    WHERE out_trade_no = p_out_trade_no FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
    END IF;

    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object('success', true, 'already_paid', true);
    END IF;

    IF p_money != v_order.amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'amount_mismatch');
    END IF;

    UPDATE payment_orders SET
        status = 'paid', trade_no = p_trade_no, pay_type = p_pay_type,
        paid_at = NOW(), notify_data = p_notify_data
    WHERE out_trade_no = p_out_trade_no;

    -- 优先使用 user_id，降级用 user_phone
    v_user_id := v_order.user_id;
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM user_profiles WHERE phone = v_order.user_phone;
    END IF;

    IF v_user_id IS NOT NULL THEN
        SELECT activate_subscription_v2(v_user_id, v_order.tier_id, v_order.billing_cycle)
        INTO v_activate_result;
    ELSE
        SELECT activate_subscription(v_order.user_phone, v_order.tier_id, v_order.billing_cycle)
        INTO v_activate_result;
    END IF;

    IF v_activate_result IS NULL OR NOT (v_activate_result->>'success')::boolean THEN
        UPDATE payment_orders SET status = 'pending' WHERE out_trade_no = p_out_trade_no;
        RETURN jsonb_build_object(
            'success', false, 'error', 'activate_failed',
            'detail', COALESCE(v_activate_result, '{}'::jsonb)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_phone', v_order.user_phone,
        'user_id', v_user_id,
        'credits_added', (v_activate_result->>'credits_added')::int,
        'out_trade_no', p_out_trade_no
    );
END;
$$;

-- ---------------------------------------------------------
-- grant_referral_commission_v2
-- ---------------------------------------------------------
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
    -- 查询订单，优先读 user_id
    SELECT user_id, user_phone, tier_id INTO v_buyer_id, v_buyer_phone, v_tier_id
    FROM payment_orders WHERE out_trade_no = p_order_out_trade_no AND status = 'paid';
    IF v_buyer_phone IS NULL AND v_buyer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '订单不存在');
    END IF;

    -- 获取 buyer_id（兼容旧订单）
    IF v_buyer_id IS NULL THEN
        SELECT id INTO v_buyer_id FROM user_profiles WHERE phone = v_buyer_phone;
    END IF;

    IF v_tier_id = 'enterprise' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'enterprise_excluded');
    END IF;

    -- 查找邀请人（优先 referred_by_id）
    SELECT referred_by_id INTO v_referrer_id FROM user_profiles WHERE id = v_buyer_id;
    IF v_referrer_id IS NULL THEN
        -- 降级：通过 referred_by (phone) 查
        SELECT up2.id INTO v_referrer_id
        FROM user_profiles up1
        JOIN user_profiles up2 ON up1.referred_by = up2.phone
        WHERE up1.id = v_buyer_id;
    END IF;
    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_referrer');
    END IF;

    -- 检查佣金次数（限前3次）—— 兼容新旧数据
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

    RETURN jsonb_build_object(
        'success', true,
        'commission', v_commission,
        'purchase_count', v_purchase_count,
        'referrer_credits', v_referrer_credits
    );
END;
$$;

-- ---------------------------------------------------------
-- check_expired_subscriptions_v2
-- 使用 user_id 降级 user_phone
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION check_expired_subscriptions_v2()
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_count INT := 0;
BEGIN
    WITH expired AS (
        UPDATE user_subscriptions
        SET status = 'expired'
        WHERE status = 'active' AND period_end < NOW()
        RETURNING user_id, user_phone
    )
    UPDATE user_profiles
    SET subscription_tier = 'free'
    WHERE id IN (SELECT user_id FROM expired WHERE user_id IS NOT NULL)
       OR phone IN (SELECT user_phone FROM expired WHERE user_id IS NULL);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
