from enum import StrEnum


class UserRole(StrEnum):
    OPERATOR = "operator"
    SUPERVISOR = "supervisor"
    ADMIN = "admin"


class Permission(StrEnum):
    APPEALS_CREATE = "appeals:create"
    APPEALS_READ_ALL = "appeals:read_all"
    KB_READ = "kb:read"
    KB_SEARCH = "kb:search"
    KB_MANAGE = "kb:manage"
    AUDIT_READ = "audit:read"
    STATS_READ = "stats:read"
    USERS_MANAGE = "users:manage"
    ROLES_MANAGE = "roles:manage"
    DICTIONARIES_MANAGE = "dictionaries:manage"


ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.OPERATOR: {
        Permission.APPEALS_CREATE,
        Permission.KB_READ,
        Permission.KB_SEARCH,
    },
    UserRole.SUPERVISOR: {
        Permission.APPEALS_CREATE,
        Permission.APPEALS_READ_ALL,
        Permission.KB_READ,
        Permission.KB_SEARCH,
        Permission.KB_MANAGE,
        Permission.AUDIT_READ,
        Permission.STATS_READ,
    },
    UserRole.ADMIN: set(Permission),
}


class ActionType(StrEnum):
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    TOKEN_REFRESH = "token_refresh"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    STATUS_CHANGE = "status_change"
    ROLE_CHANGE = "role_change"
    KB_ARTICLE_OPEN = "kb_article_open"
    APPEAL_RETURN = "appeal_return"
    FILE_UPLOAD = "file_upload"
    FILE_DOWNLOAD = "file_download"
    SEARCH = "search"


class EntityType(StrEnum):
    USER = "user"
    KB_ARTICLE = "kb_article"
    KB_DIRECTION = "kb_direction"
    KB_TOPIC = "kb_topic"
    APPEAL = "appeal"
    AUDIT_LOG = "audit_log"
    AUTH = "auth"
