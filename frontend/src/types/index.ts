export type Role = 'operator' | 'supervisor' | 'admin'

export interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface KBDirection {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface KBTopic {
  id: string
  name: string
  description: string | null
  direction_id: string
  is_active: boolean
  created_at: string
}

export interface KBAttachment {
  id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string | null
  created_at: string
}

export interface KBArticleListItem {
  id: string
  title: string
  direction_id: string | null
  topic_id: string | null
  author_id: string | null
  is_actual: boolean
  created_at: string
  updated_at: string
}

export interface KBArticle extends KBArticleListItem {
  content: string
  links: string[]
  attachments: KBAttachment[]
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  changed_fields: string[] | null
  description: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}
