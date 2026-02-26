-- 替换旧的清理函数：统一保留30天
CREATE OR REPLACE FUNCTION cleanup_old_tasks()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM generation_tasks
    WHERE created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_tasks IS '清理30天前的生成任务记录，每天凌晨3点自动执行';
