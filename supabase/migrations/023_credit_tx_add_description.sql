-- ============================================================
-- 023: 为积分流水函数添加 description 参数，记录具体模型信息
-- ============================================================

-- 1. 重建 deduct_user_credits_v2（新增 p_description）
DROP FUNCTION IF EXISTS deduct_user_credits_v2(UUID, INT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION deduct_user_credits_v2(
    p_user_id UUID,
    p_amount INT,
    p_reference_id TEXT DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'generation',
    p_description TEXT DEFAULT NULL
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

    INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, reference_id, description)
    VALUES (p_user_id, p_tx_type, -p_amount, v_new, p_reference_id, p_description);

    RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 重建 refund_user_credits_v2（新增 p_description）
DROP FUNCTION IF EXISTS refund_user_credits_v2(UUID, INT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION refund_user_credits_v2(
    p_user_id UUID,
    p_amount INT,
    p_reference_id TEXT DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'refund',
    p_description TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    v_new INT;
BEGIN
    UPDATE user_profiles
    SET credits = credits + p_amount
    WHERE id = p_user_id
    RETURNING credits INTO v_new;

    INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, reference_id, description)
    VALUES (p_user_id, p_tx_type, p_amount, v_new, p_reference_id, p_description);

    RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
