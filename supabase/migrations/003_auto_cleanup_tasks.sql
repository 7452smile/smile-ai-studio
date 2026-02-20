-- 创建清理函数
CREATE OR REPLACE FUNCTION cleanup_old_tasks()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM generation_tasks
    WHERE created_at < NOW() - INTERVAL '1 day';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- 启用 pg_cron 扩展（如果还没启用）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 设置定时任务：每天凌晨 3 点执行清理
SELECT cron.schedule(
    'cleanup-old-tasks',           -- 任务名称
    '0 3 * * *',                   -- Cron 表达式：每天 3:00
    'SELECT cleanup_old_tasks()'   -- 执行的 SQL
);

-- 注释
COMMENT ON FUNCTION cleanup_old_tasks IS '清理 1 天前的生成任务记录，每天凌晨 3 点自动执行';
