-- ============================================================
-- 用户积分系统：原子 RPC 函数
-- ============================================================

-- 1. 扣减用户积分（原子操作，行锁防并发）
-- 返回扣减后的余额，余额不足返回 -1
CREATE OR REPLACE FUNCTION deduct_user_credits(p_phone TEXT, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_current INT;
BEGIN
    -- 行锁：SELECT ... FOR UPDATE
    SELECT credits INTO v_current
    FROM user_profiles
    WHERE phone = p_phone
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN -1;
    END IF;

    IF v_current < p_amount THEN
        RETURN -1;
    END IF;

    UPDATE user_profiles
    SET credits = credits - p_amount
    WHERE phone = p_phone;

    RETURN v_current - p_amount;
END;
$$;

-- 2. 退还用户积分（原子操作）
-- 返回退还后的余额
CREATE OR REPLACE FUNCTION refund_user_credits(p_phone TEXT, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_new INT;
BEGIN
    UPDATE user_profiles
    SET credits = credits + p_amount
    WHERE phone = p_phone
    RETURNING credits INTO v_new;

    IF NOT FOUND THEN
        RETURN -1;
    END IF;

    RETURN v_new;
END;
$$;

-- 3. 查询用户积分
CREATE OR REPLACE FUNCTION get_user_credits(p_phone TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_credits INT;
BEGIN
    SELECT credits INTO v_credits
    FROM user_profiles
    WHERE phone = p_phone;

    IF NOT FOUND THEN
        RETURN -1;
    END IF;

    RETURN v_credits;
END;
$$;

-- 启用 user_profiles 的 Realtime 推送
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;

-- 修改 credits 列默认值为 188
ALTER TABLE user_profiles ALTER COLUMN credits SET DEFAULT 188;
