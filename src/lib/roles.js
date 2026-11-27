// ─────────────────────────────────────────────────────────────
// LU CONNECT Admin — Role & Page Access
// Single source of truth. Do not hardcode levels elsewhere.
// ─────────────────────────────────────────────────────────────

export const ROLE_LEVELS = {
  student: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

export const ROLE_LABELS = {
  student: 'Student',
  moderator: 'Moderator',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const ROLE_COLORS = {
  student: '#6d7382',
  moderator: '#3b82f6',
  admin: '#f97316',
  super_admin: '#ef4444',
};

// Minimum role level required to see each page.
// 1 = moderator and up · 2 = admin and up · 3 = super_admin only
export const PAGE_ACCESS = {
  // Moderator and up
  dashboard: 1,
  moderation: 1,
  reports: 1,
  appeals: 1,
  posts: 1,
  comments: 1,
  'help-desk': 1,
  'recovery-messages': 1,

  // Admin and up
  students: 2,
  'pending-approvals': 2,
  'security-threats': 2,
  announcements: 2,
  events: 2,
  groups: 2,
  visitors: 2,
  ai: 2,
  boosts: 2,
  'audit-logs': 2,

  // Super admin only
  settings: 3,
  payments: 3,
  admins: 3,
  'admin-codes': 3,
  'otp-manager': 3,

  // Shared future features
  'team-chat': 1, // moderators, admins, super admins
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Safe role name from a profiles row (has `roles: { name }` joined). */
export function roleNameOf(profile) {
  return profile?.roles?.name || 'student';
}

/** Numeric level. Falls back to 0 (student). */
export function roleLevelOf(profile) {
  const name = roleNameOf(profile);
  return profile?.roles?.level ?? ROLE_LEVELS[name] ?? 0;
}

/** Can a user with this level access this route? */
export function canAccess(level, routePath) {
  const required = PAGE_ACCESS[routePath];
  if (required === undefined) return level >= 1; // unknown route = must be at least moderator
  return level >= required;
}
