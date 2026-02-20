-- 原子扣减 API Key 积分，避免并发竞态
CREATE OR REPLACE FUNCTION deduct_api_key_credits(
    p_key_id UUID,
    p_amount INTEGER
) RETURNS VOID AS $$
BEGIN
    UPDATE freepik_api_keys
    SET remaining_credits = GREATEST(0, remaining_credits - p_amount)
    WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql;
