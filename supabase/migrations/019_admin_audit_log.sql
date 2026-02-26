CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_user TEXT,
    params JSONB,
    result_success BOOLEAN NOT NULL,
    result_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at DESC);
