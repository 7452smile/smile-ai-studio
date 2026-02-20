-- ============================================================
-- 013: 清理旧的 phone-based RPC 函数
-- 前置条件：所有 edge function 已迁移到 _v2 版本
-- ============================================================

-- 删除旧 RPC 函数（已被 _v2 版本替代）
DROP FUNCTION IF EXISTS deduct_user_credits(TEXT, INT);
DROP FUNCTION IF EXISTS refund_user_credits(TEXT, INT);
DROP FUNCTION IF EXISTS get_user_credits(TEXT);
DROP FUNCTION IF EXISTS check_concurrency(TEXT, TEXT);
DROP FUNCTION IF EXISTS grant_daily_credits(TEXT);
DROP FUNCTION IF EXISTS activate_subscription(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS generate_referral_code(TEXT);
DROP FUNCTION IF EXISTS apply_referral_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS redeem_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS log_failed_refund(TEXT, INTEGER, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS safe_process_payment(TEXT, TEXT, TEXT, NUMERIC, JSONB);
DROP FUNCTION IF EXISTS grant_referral_commission(TEXT, INT);
DROP FUNCTION IF EXISTS check_expired_subscriptions();
