export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'action_items';

export interface InteractionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  mode?: ReflectionMode;
}

export interface ImageAttachment {
  id: string;
  url: string;
  name?: string;
  caption?: string;
  notes?: string;
  createdAt?: string;
}

export interface EntryLocation {
  lat: number;
  lng: number;
  placeName: string;
  formattedAddress?: string;
  placeId?: string;
  vicinity?: string;
  pinnedAt?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood?: string;
  keyThemes?: string[];
  insights?: string[];
  summary?: string;
  location?: EntryLocation;
  messages: InteractionMessage[];
  images?: ImageAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface ReflectionRequest {
  prompt?: string;
  history?: Array<{ role: 'user' | 'assistant' | 'model'; content: string }>;
  mode?: ReflectionMode;
  entryTitle?: string;
}

export interface ReflectionResponse {
  text: string;
  modelUsed: string;
  timestamp: string;
}

export interface SummaryResponse {
  summary: string;
  mood: string;
  keyThemes: string[];
  insights: string[];
  modelUsed: string;
  timestamp: string;
}

// ==========================================
// RAG (RETRIEVAL-AUGMENTED GENERATION) TYPES
// ==========================================

export interface RagSourceMatch {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  similarity: number;
  keyThemes?: string[];
  mood?: string;
}

export interface RagQueryResponse {
  answer: string;
  sources: RagSourceMatch[];
  modelUsed: string;
  timestamp: string;
}

// ==========================================
// AUTONOMOUS AI AGENTS SUITE TYPES
// ==========================================

export type AgentRoleType = 'growth_coach' | 'bias_auditor' | 'action_planner' | 'decision_evaluator';

export interface AgentRunRequest {
  agentType: AgentRoleType;
  targetMode: 'single' | 'all';
  activeEntry?: JournalEntry | null;
  allEntries?: JournalEntry[];
  customGoal?: string;
  mcpContext?: Record<string, unknown>;
}

export interface AgentRunResponse {
  report: string;
  agentType: AgentRoleType;
  agentName: string;
  thoughtProcess: string[];
  entriesAnalyzedCount: number;
  modelUsed: string;
  timestamp: string;
}

// ==========================================
// MODEL CONTEXT PROTOCOL (MCP) TYPES
// ==========================================

export interface McpTool {
  id: string;
  name: string;
  category: 'calendar' | 'knowledge' | 'developer' | 'wellness';
  description: string;
  provider: string;
  parameters: Record<string, { type: string; description: string; default?: unknown }>;
  enabled?: boolean;
}

export type UserRole = 'owner' | 'admin' | 'user';

export interface RolePermissions {
  canManageAdmins: boolean;
  canConfigurePlatform: boolean;
  canDeleteUsers: boolean;
  canModerateReports: boolean;
  canCheckDiscrepancies: boolean;
  canAccessAuditLogs: boolean;
  canReadOwnEntries: boolean;
  canWriteOwnEntries: boolean;
  canModifyOwnEntries: boolean;
  canDeleteOwnEntries: boolean;
  canReadOthersEntries: boolean; // MUST be strictly false for all roles (Least Privilege!)
}

export interface UserProfileWithRole extends UserProfile {
  role: UserRole;
  signatureVerified: boolean;
  tokenIssuer?: string;
  roleAssignedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  targetResource: string;
  details?: Record<string, unknown>;
  ipHash?: string;
  signatureStatus: 'verified' | 'tamper_evident_valid' | 'system_signed';
}

export interface ModerationReport {
  id: string;
  timestamp: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high';
  snippetHash: string;
  actionTaken?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface SystemDiscrepancy {
  id: string;
  timestamp: string;
  category: 'auth_anomaly' | 'rate_limit_spike' | 'orphan_ref' | 'schema_violation' | 'least_privilege_audit';
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved';
  severity: 'info' | 'warning' | 'critical';
  detectedAt: string;
  resolutionNote?: string;
}

export interface PlatformConfig {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  moderationAutoScan: boolean;
  auditRetentionDays: number;
  activeModelTier: string;
  rateLimitPerMinute: number;
  leastPrivilegeStrictLock: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ManagedUserAccount {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  lastActiveAt?: string;
  entriesCount?: number; // Aggregated count only - no private content!
}

// ==========================================
// NOTIFICATION DIRECTIVE TYPES (SLACK / DISCORD / EMAIL)
// ==========================================

export type NotificationChannelType = 'slack' | 'discord' | 'email';

export type NotificationPrivacyLevel = 'minimal' | 'with_insights' | 'full_preview';

export interface NotificationTriggerRules {
  notifyOnAiSummary: boolean;
  notifyOnHighStress: boolean;
  notifyOnBreakthrough: boolean;
  notifyOnAgentReport: boolean;
  customKeywords: string[]; // e.g. ["Career", "Urgent", "Goal"]
}

export interface NotificationChannelConfig {
  id: string;
  type: NotificationChannelType;
  enabled: boolean;
  name: string;
  webhookUrlMasked?: string;
  hasWebhookConfigured: boolean;
  recipientEmail?: string;
  privacyLevel: NotificationPrivacyLevel;
  triggerRules: NotificationTriggerRules;
  lastDispatchedAt?: string;
  totalDispatchedCount: number;
}

export interface NotificationPayloadSchema {
  version: '2026-09-01';
  entry_type: 'reflection' | 'ai_summary' | 'agent_report' | 'milestone';
  title: string;
  summary: string;
  timestamp: string;
  entry_url: string;
  mood?: string;
  keyThemes?: string[];
  insights?: string[];
  privacy_level: NotificationPrivacyLevel;
  content_snippet?: string;
}

export interface NotificationDeliveryLog {
  id: string;
  timestamp: string;
  channel: NotificationChannelType;
  channelName: string;
  status: 'delivered' | 'failed' | 'simulated';
  statusCode?: number;
  triggerReason: string;
  entryTitle: string;
  summaryPreview: string;
  retryAttempts?: number;
  error?: string;
}


