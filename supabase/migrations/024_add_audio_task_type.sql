-- 允许 generation_tasks.task_type 包含 'audio'（TTS 功能）
ALTER TABLE generation_tasks DROP CONSTRAINT IF EXISTS generation_tasks_task_type_check;
ALTER TABLE generation_tasks ADD CONSTRAINT generation_tasks_task_type_check CHECK (task_type IN ('image', 'video', 'audio'));

COMMENT ON COLUMN generation_tasks.task_type IS '任务类型：image/video/audio';
