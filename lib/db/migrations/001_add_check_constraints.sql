-- Migration 001: Add missing CHECK constraints on activity logs, order messages, and notifications

ALTER TABLE admin_activity_logs
  DROP CONSTRAINT IF EXISTS admin_activity_logs_action_check;
ALTER TABLE admin_activity_logs
  ADD CONSTRAINT admin_activity_logs_action_check
  CHECK (action IN ('create', 'update', 'delete', 'rollback'));

ALTER TABLE order_messages
  DROP CONSTRAINT IF EXISTS order_messages_sender_type_check;
ALTER TABLE order_messages
  ADD CONSTRAINT order_messages_sender_type_check
  CHECK (sender_type IN ('admin', 'customer', 'system'));

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('general', 'order', 'promo', 'system'));

-- Ensure key indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_entity
  ON admin_activity_logs (entity);
CREATE INDEX IF NOT EXISTS idx_order_messages_created_at
  ON order_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications (type);

COMMENT ON TABLE admin_activity_logs IS 'Admin activity audit trail';
COMMENT ON TABLE order_messages IS 'Order-level messaging between admin and customers';
COMMENT ON TABLE notifications IS 'Customer-facing notifications';
