-- ============================================================
-- 订阅系统：套餐定义 + 支付订单 + 用户订阅
-- ============================================================

-- 1. 套餐定义表
CREATE TABLE subscription_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    monthly_price NUMERIC(10,2) DEFAULT 0,
    annual_price NUMERIC(10,2) DEFAULT 0,
    monthly_credits INT DEFAULT 0,
    max_concurrent_image INT DEFAULT 999,
    max_concurrent_video INT DEFAULT 999,
    max_concurrent_total INT,
    history_hours INT DEFAULT 1,
    persist_to_r2 BOOLEAN DEFAULT false,
    features JSONB DEFAULT '[]',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- 插入6档套餐
INSERT INTO subscription_tiers (id, name, monthly_price, annual_price, monthly_credits, max_concurrent_image, max_concurrent_video, max_concurrent_total, history_hours, persist_to_r2, features, sort_order) VALUES
('free',       '免费版',   0,       0,       0,      999, 999, 1,    1,    false, '["注册送188积分","每日登录+10积分(上限200)","全部模型权限"]', 0),
('starter',    '入门版',   19.9,    199,     2000,   3,   1,   NULL, 1,    false, '["每月2,000积分","3图片+1视频并发","全部模型权限"]', 1),
('advanced',   '进阶版',   49,      490,     6000,   5,   5,   NULL, 1,    false, '["每月6,000积分","5图片+5视频并发","全部模型权限"]', 2),
('flagship',   '旗舰版',   99,      990,     15000,  999, 999, NULL, 168,  true,  '["每月15,000积分","无限并发","历史保存7天","优先体验新模型"]', 3),
('studio',     '工作室版', 299,     2990,    60000,  999, 999, NULL, 720,  true,  '["每月60,000积分","无限并发","历史保存30天","1v1专属客服","API权限","Beta体验","VIP快速通道"]', 4),
('enterprise', '企业版',   1299,    12990,   999999, 999, 999, NULL, 8760, true,  '["无限积分","无限并发","历史保存1年","所有权限","功能定制"]', 5);

-- 2. 支付订单表
CREATE TABLE payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    out_trade_no TEXT UNIQUE NOT NULL,
    trade_no TEXT,
    user_phone TEXT NOT NULL,
    tier_id TEXT REFERENCES subscription_tiers(id),
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly','annual')),
    amount NUMERIC(10,2) NOT NULL,
    pay_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired')),
    notify_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 3. 用户订阅表
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_phone TEXT NOT NULL,
    tier_id TEXT REFERENCES subscription_tiers(id),
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly','annual')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
    period_start TIMESTAMPTZ DEFAULT NOW(),
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 同一用户只能有一个活跃订阅
CREATE UNIQUE INDEX idx_user_sub_active ON user_subscriptions(user_phone) WHERE status='active';

-- 4. 修改 user_profiles 添加订阅相关字段
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_daily_credit_at TIMESTAMPTZ;

-- ============================================================
-- 5. RPC 函数
-- ============================================================

-- 5.1 并发检查
CREATE OR REPLACE FUNCTION check_concurrency(p_phone TEXT, p_task_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_tier TEXT;
    v_max_image INT;
    v_max_video INT;
    v_max_total INT;
    v_current_image INT;
    v_current_video INT;
    v_current_total INT;
BEGIN
    -- 获取用户套餐
    SELECT subscription_tier INTO v_tier FROM user_profiles WHERE phone = p_phone;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'reason', '用户不存在');
    END IF;

    -- 获取套餐限制
    SELECT max_concurrent_image, max_concurrent_video, max_concurrent_total
    INTO v_max_image, v_max_video, v_max_total
    FROM subscription_tiers WHERE id = v_tier;

    -- 统计当前进行中的任务
    SELECT
        COUNT(*) FILTER (WHERE task_type = 'image'),
        COUNT(*) FILTER (WHERE task_type = 'video'),
        COUNT(*)
    INTO v_current_image, v_current_video, v_current_total
    FROM generation_tasks
    WHERE user_phone = p_phone AND status = 'processing';

    -- 总并发限制（免费版用这个）
    IF v_max_total IS NOT NULL THEN
        IF v_current_total >= v_max_total THEN
            RETURN jsonb_build_object('allowed', false, 'reason',
                '免费版同时只能进行 ' || v_max_total || ' 个任务，请等待当前任务完成',
                'tier', v_tier);
        END IF;
        RETURN jsonb_build_object('allowed', true, 'tier', v_tier);
    END IF;

    -- 按类型并发限制
    IF p_task_type = 'image' AND v_current_image >= v_max_image THEN
        RETURN jsonb_build_object('allowed', false, 'reason',
            '当前套餐最多同时进行 ' || v_max_image || ' 个图片任务',
            'tier', v_tier);
    END IF;

    IF p_task_type = 'video' AND v_current_video >= v_max_video THEN
        RETURN jsonb_build_object('allowed', false, 'reason',
            '当前套餐最多同时进行 ' || v_max_video || ' 个视频任务',
            'tier', v_tier);
    END IF;

    RETURN jsonb_build_object('allowed', true, 'tier', v_tier);
END;
$$;

-- 5.2 每日登录积分（免费用户每日+10，上限200）
CREATE OR REPLACE FUNCTION grant_daily_credits(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_tier TEXT;
    v_credits INT;
    v_last_daily TIMESTAMPTZ;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT subscription_tier, credits, last_daily_credit_at
    INTO v_tier, v_credits, v_last_daily
    FROM user_profiles
    WHERE phone = p_phone
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', '用户不存在');
    END IF;

    -- 仅免费用户发放每日积分
    IF v_tier != 'free' THEN
        RETURN jsonb_build_object('success', false, 'reason', '付费用户无需每日积分');
    END IF;

    -- 今天已经领过
    IF v_last_daily IS NOT NULL AND v_last_daily::date = v_today THEN
        RETURN jsonb_build_object('success', false, 'reason', '今日已领取');
    END IF;

    -- 积分上限200
    IF v_credits >= 200 THEN
        RETURN jsonb_build_object('success', false, 'reason', '积分已达上限200');
    END IF;

    -- 发放10积分，不超过200
    UPDATE user_profiles
    SET credits = LEAST(credits + 10, 200),
        last_daily_credit_at = NOW()
    WHERE phone = p_phone;

    RETURN jsonb_build_object('success', true, 'granted', LEAST(10, 200 - v_credits), 'credits', LEAST(v_credits + 10, 200));
END;
$$;

-- 5.3 激活订阅（支付成功后调用）
CREATE OR REPLACE FUNCTION activate_subscription(p_phone TEXT, p_tier_id TEXT, p_billing_cycle TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_monthly_credits INT;
    v_period_end TIMESTAMPTZ;
    v_credits_to_add INT;
BEGIN
    -- 获取套餐信息
    SELECT monthly_credits INTO v_monthly_credits
    FROM subscription_tiers WHERE id = p_tier_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', '套餐不存在');
    END IF;

    -- 计算到期时间和积分
    IF p_billing_cycle = 'annual' THEN
        v_period_end := NOW() + INTERVAL '1 year';
        v_credits_to_add := v_monthly_credits * 12;
    ELSE
        v_period_end := NOW() + INTERVAL '1 month';
        v_credits_to_add := v_monthly_credits;
    END IF;

    -- 取消旧的活跃订阅
    UPDATE user_subscriptions
    SET status = 'cancelled'
    WHERE user_phone = p_phone AND status = 'active';

    -- 创建新订阅
    INSERT INTO user_subscriptions (user_phone, tier_id, billing_cycle, status, period_start, period_end)
    VALUES (p_phone, p_tier_id, p_billing_cycle, 'active', NOW(), v_period_end);

    -- 更新用户套餐 + 发放积分
    UPDATE user_profiles
    SET subscription_tier = p_tier_id,
        credits = credits + v_credits_to_add
    WHERE phone = p_phone;

    RETURN jsonb_build_object('success', true, 'credits_added', v_credits_to_add, 'period_end', v_period_end);
END;
$$;

-- 5.4 检查过期订阅（定时任务调用）
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    -- 将过期的订阅标记为 expired
    WITH expired AS (
        UPDATE user_subscriptions
        SET status = 'expired'
        WHERE status = 'active' AND period_end < NOW()
        RETURNING user_phone
    )
    UPDATE user_profiles
    SET subscription_tier = 'free'
    WHERE phone IN (SELECT user_phone FROM expired);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
