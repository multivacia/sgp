CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL UNIQUE,
  status varchar(20) NOT NULL,
  source varchar(20) NOT NULL DEFAULT 'MANUAL',
  category varchar(30) NOT NULL,
  severity varchar(20) NOT NULL,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES app_users(id),
  created_by_collaborator_id uuid NULL REFERENCES collaborators(id),
  module_name varchar(80) NULL,
  route_path varchar(255) NULL,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id varchar(100) NULL,
  correlation_id varchar(100) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_ticket_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL,
  destination varchar(255) NULL,
  status varchar(20) NOT NULL,
  provider_message_id varchar(255) NULL,
  error_message varchar(500) NULL,
  sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by_user
  ON support_tickets (created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at
  ON support_tickets (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_ticket_notifications_ticket
  ON support_ticket_notifications (ticket_id);
