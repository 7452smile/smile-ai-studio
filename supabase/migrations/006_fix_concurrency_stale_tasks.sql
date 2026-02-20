-- 修复并发检查：超过30分钟的 processing 任务自动标记为 failed，不计入并发
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
    v_stale_count INT;
BEGIN
    -- 先清理该用户超过30分钟的卡死任务
    UPDATE generation_tasks
    SET status = 'failed', error_message = '任务超时（30分钟未完成）'
    WHERE user_phone = p_phone
      AND status IN ('processing', 'pending')
      AND created_at < NOW() - INTERVAL '30 minutes';

    GET DIAGNOSTICS v_stale_count = ROW_COUNT;
    IF v_stale_count > 0 THEN
        RAISE NOTICE 'Cleaned % stale tasks for user %', v_stale_count, p_phone;
    END IF;

    -- 获取用户套餐
    SELECT subscription_tier INTO v_tier FROM user_profiles WHERE phone = p_phone;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'reason', '用户不存在');
    END IF;

    -- 获取套餐限制
    SELECT max_concurrent_image, max_concurrent_video, max_concurrent_total
    INTO v_max_image, v_max_video, v_max_total
    FROM subscription_tiers WHERE id = v_tier;

    -- 统计当前进行中的任务（只看30分钟内的，双重保险）
    SELECT
        COUNT(*) FILTER (WHERE task_type = 'image'),
        COUNT(*) FILTER (WHERE task_type = 'video'),
        COUNT(*)
    INTO v_current_image, v_current_video, v_current_total
    FROM generation_tasks
    WHERE user_phone = p_phone
      AND status IN ('processing', 'pending')
      AND created_at >= NOW() - INTERVAL '30 minutes';

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
