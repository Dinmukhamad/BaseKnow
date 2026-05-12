CREATE TYPE user_role AS ENUM ('operator', 'supervisor', 'admin');
CREATE TYPE action_type AS ENUM ('login', 'logout', 'login_failed', 'token_refresh', 'create', 'update', 'delete', 'view', 'status_change', 'role_change', 'kb_article_open', 'appeal_return', 'file_upload', 'file_download', 'search');
CREATE TYPE entity_type AS ENUM ('user', 'kb_article', 'kb_direction', 'kb_topic', 'appeal', 'audit_log', 'auth');

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE,
  username varchar(64) NOT NULL UNIQUE,
  full_name varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  role user_role NOT NULL,
  is_active boolean NOT NULL,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(128) NOT NULL UNIQUE,
  jti varchar(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip_address varchar(64),
  user_agent varchar(512),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE kb_directions (
  id uuid PRIMARY KEY,
  name varchar(160) NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE kb_topics (
  id uuid PRIMARY KEY,
  name varchar(160) NOT NULL,
  description text,
  direction_id uuid NOT NULL REFERENCES kb_directions(id) ON DELETE CASCADE,
  is_active boolean NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT uq_kb_topics_direction_name UNIQUE (direction_id, name)
);

CREATE TABLE kb_articles (
  id uuid PRIMARY KEY,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  direction_id uuid REFERENCES kb_directions(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES kb_topics(id) ON DELETE SET NULL,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  is_actual boolean NOT NULL,
  links jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE kb_attachments (
  id uuid PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  filename varchar(255) NOT NULL,
  original_filename varchar(255) NOT NULL,
  storage_path varchar(512) NOT NULL,
  file_size integer NOT NULL,
  mime_type varchar(160),
  uploaded_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action action_type NOT NULL,
  entity_type entity_type,
  entity_id varchar(64),
  before_data jsonb,
  after_data jsonb,
  changed_fields jsonb,
  description text,
  ip_address varchar(64),
  user_agent varchar(512),
  created_at timestamptz NOT NULL
);

CREATE INDEX ix_kb_articles_fulltext
  ON kb_articles
  USING gin (to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(content, '')));

CREATE INDEX ix_audit_logs_lookup
  ON audit_logs (created_at DESC, action, entity_type, entity_id);
