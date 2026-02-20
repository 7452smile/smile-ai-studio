-- 生成任务记录表
CREATE TABLE generation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 用户信息
    user_phone TEXT NOT NULL,

    -- 任务信息
    task_type TEXT NOT NULL CHECK (task_type IN ('image', 'video')),
    model TEXT NOT NULL,
    prompt TEXT,

    -- Freepik 相关
    freepik_task_id TEXT,
    api_key_id UUID REFERENCES freepik_api_keys(id),
    credits_cost INTEGER DEFAULT 0,

    -- 状态
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    result_url TEXT,
    error_message TEXT,

    -- 请求参数（存储完整参数，方便调试）
    request_params JSONB,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX idx_tasks_user_phone ON generation_tasks (user_phone);
CREATE INDEX idx_tasks_status ON generation_tasks (status);
CREATE INDEX idx_tasks_freepik_id ON generation_tasks (freepik_task_id);
CREATE INDEX idx_tasks_created_at ON generation_tasks (created_at DESC);

-- 启用 Realtime（前端订阅用）
ALTER PUBLICATION supabase_realtime ADD TABLE generation_tasks;

-- 注释
COMMENT ON TABLE generation_tasks IS '生成任务记录';
COMMENT ON COLUMN generation_tasks.task_type IS '任务类型：image/video';
COMMENT ON COLUMN generation_tasks.model IS '使用的模型：seedream/minimax/kling 等';
COMMENT ON COLUMN generation_tasks.freepik_task_id IS 'Freepik 返回的任务 ID';
COMMENT ON COLUMN generation_tasks.status IS '状态：pending/processing/completed/failed';
