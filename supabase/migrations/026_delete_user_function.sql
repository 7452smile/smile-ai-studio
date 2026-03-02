-- ============================================================
-- 026: 删除用户函数（级联删除所有关联数据）
-- ============================================================

-- 添加级联删除约束
ALTER TABLE referral_codes
DROP CONSTRAINT IF EXISTS referral_codes_user_id_fkey,
ADD CONSTRAINT referral_codes_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES user_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE referral_rewards
DROP CONSTRAINT IF EXISTS referral_rewards_referrer_id_fkey,
ADD CONSTRAINT referral_rewards_referrer_id_fkey
    FOREIGN KEY (referrer_id)
    REFERENCES user_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE referral_rewards
DROP CONSTRAINT IF EXISTS referral_rewards_referee_id_fkey,
ADD CONSTRAINT referral_rewards_referee_id_fkey
    FOREIGN KEY (referee_id)
    REFERENCES user_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE redemption_records
DROP CONSTRAINT IF EXISTS redemption_records_user_id_fkey,
ADD CONSTRAINT redemption_records_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES user_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE generation_tasks
DROP CONSTRAINT IF EXISTS generation_tasks_user_id_fkey,
ADD CONSTRAINT generation_tasks_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES user_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey,
ADD CONSTRAINT user_subscriptions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES user_profiles(id)
    ON DELETE CASCADE;

ALTER TABLE payment_orders
DROP CONSTRAINT IF EXISTS payment_orders_user_id_fkey,
ADD CONSTRAINT payment_orders_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES user_profiles(id)
    ON DELETE CASCADE;

-- 创建删除用户函数
CREATE OR REPLACE FUNCTION delete_user_completely(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- 删除 user_profiles（会级联删除所有关联数据）
    DELETE FROM user_profiles WHERE id = p_user_id;

    -- 删除 auth 用户（需要 service_role 权限）
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
