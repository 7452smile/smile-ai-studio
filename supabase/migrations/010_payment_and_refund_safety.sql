-- ============================================================
-- 010: 支付安全 + 退款失败记录
-- ============================================================

-- 1. 退款失败记录表（用于追踪和手动补偿）
CREATE TABLE IF NOT EXISTS failed_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_phone TEXT NOT NULL,
    amount INTEGER NOT NULL,
    task_id UUID,
    source TEXT NOT NULL DEFAULT 'webhook',  -- webhook / edge_function
    reason TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_refunds_unresolved
    ON failed_refunds(resolved) WHERE resolved = false;

-- 2. 安全支付处理函数（带行锁防并发重复激活）
CREATE OR REPLACE FUNCTION safe_process_payment(
    p_out_trade_no TEXT,
    p_trade_no TEXT,
    p_pay_type TEXT,
    p_money NUMERIC,
    p_notify_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_activate_result JSONB;
BEGIN
    -- 带行锁查询订单（阻止并发处理同一订单）
    SELECT * INTO v_order
    FROM payment_orders
    WHERE out_trade_no = p_out_trade_no
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
    END IF;

    -- 幂等检查：已处理过直接返回成功
    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object('success', true, 'already_paid', true);
    END IF;

    -- 金额校验
    IF p_money != v_order.amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'amount_mismatch');
    END IF;

    -- 更新订单状态为 paid
    UPDATE payment_orders SET
        status = 'paid',
        trade_no = p_trade_no,
        pay_type = p_pay_type,
        paid_at = NOW(),
        notify_data = p_notify_data
    WHERE out_trade_no = p_out_trade_no;

    -- 激活订阅
    SELECT activate_subscription(v_order.user_phone, v_order.tier_id, v_order.billing_cycle)
    INTO v_activate_result;

    IF v_activate_result IS NULL OR NOT (v_activate_result->>'success')::boolean THEN
        -- 激活失败，回滚订单状态以便下次重试
        UPDATE payment_orders SET status = 'pending'
        WHERE out_trade_no = p_out_trade_no;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'activate_failed',
            'detail', COALESCE(v_activate_result, '{}'::jsonb)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_phone', v_order.user_phone,
        'credits_added', (v_activate_result->>'credits_added')::int,
        'out_trade_no', p_out_trade_no
    );
END;
$$;

-- 3. 记录退款失败的函数
CREATE OR REPLACE FUNCTION log_failed_refund(
    p_phone TEXT,
    p_amount INTEGER,
    p_task_id UUID DEFAULT NULL,
    p_source TEXT DEFAULT 'webhook',
    p_reason TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO failed_refunds (user_phone, amount, task_id, source, reason)
    VALUES (p_phone, p_amount, p_task_id, p_source, p_reason);
END;
$$;

-- 4. 定时检查过期订阅（每小时执行一次）
SELECT cron.schedule(
    'check-expired-subscriptions',
    '0 * * * *',
    'SELECT check_expired_subscriptions()'
);
