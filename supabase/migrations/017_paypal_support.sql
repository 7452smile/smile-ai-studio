-- PayPal 支付支持
-- payment_orders 增加 currency 和 paypal_order_id 字段

ALTER TABLE payment_orders
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CNY',
    ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;

-- paypal_order_id 索引（用于 capture 时查找订单）
CREATE INDEX IF NOT EXISTS idx_payment_orders_paypal_order_id
    ON payment_orders(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
