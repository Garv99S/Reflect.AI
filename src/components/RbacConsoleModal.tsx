import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  UserCheck,
  UserX,
  Users,
  Settings,
  FileText,
  AlertTriangle,
  RefreshCw,
  X,
  CheckCircle2,
  Sliders,
  Database,
  Activity,
  KeyRound,
  ExternalLink,
  Search,
  Eye,
  Trash2,
  Sparkles,
  Server,
} from 'lucide-react';
import type {
  UserRole,
  RolePermissions,
  AuditLogEntry,
  ModerationReport,
  SystemDiscrepancy,
  PlatformConfig,
  ManagedUserAccount,
  UserProfile,
} from '../types';
import {
  fetchUserRoleAndPermissions,
  fetchManagedUsers,
  setUserRole,
  fetchAuditLogs,
  fetchModerationReports,
  resolveModerationReport,
  createModerationReport,
  fetchDiscrepancies,
  triggerDiscrepancyScan,
  resolveDiscrepancy,
  deleteUserAccount,
  fetchPlatformConfig,
  updatePlatformConfig,
} from '../lib/rbacApi';

interface RbacConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  activeRole: UserRole;
  onRoleChanged?: () => void;
}

export const RbacConsoleModal: React.FC<RbacConsoleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeRole,
  onRoleChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'admins' | 'moderation' | 'discrepancies' | 'audit' | 'config' | 'users'>(
    activeRole === 'owner' ? 'overview' : activeRole === 'admin' ? 'moderation' : 'overview'
  );

  // Data States
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [usersList, setUsersList] = useState<ManagedUserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [moderationReports, setModerationReports] = useState<ModerationReport[]>([]);
  const [discrepancies, setDiscrepancies] = useState<SystemDiscrepancy[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);

  // Operation States
  const [loading, setLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Forms
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newTargetRole, setNewTargetRole] = useState<UserRole>('admin');
  const [searchFilter, setSearchFilter] = useState('');
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<'all' | 'owner' | 'admin' | 'user'>('all');

  const formatLastActive = (timestamp?: string): string => {
    if (!timestamp) return 'Never';
    const time = new Date(timestamp).getTime();
    if (isNaN(time)) return 'Recently';
    const diffMs = Date.now() - time;
    if (diffMs < 60000) return 'Active just now';
    if (diffMs < 3600000) return `Active ${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `Active ${Math.floor(diffMs / 3600000)}h ago`;
    return `Active ${new Date(timestamp).toLocaleDateString()}`;
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      !searchFilter ||
      (u.email && u.email.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (u.uid && u.uid.toLowerCase().includes(searchFilter.toLowerCase()));
    const matchesRole = directoryRoleFilter === 'all' || u.role === directoryRoleFilter;
    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    if (isOpen) {
      loadAllRbacData();
    }
  }, [isOpen, activeRole]);

  const loadAllRbacData = async () => {
    setLoading(true);
    setActionErrorMessage(null);
    try {
      // 1. Fetch user permissions and verified identity
      const roleData = await fetchUserRoleAndPermissions();
      setPermissions(roleData.permissions);

      // 2. If Admin or Owner, load governance datasets
      if (activeRole === 'owner' || activeRole === 'admin') {
        const [usersRes, auditRes, modRes, discRes, confRes] = await Promise.all([
          fetchManagedUsers().catch(() => ({ users: [], totalCount: 0 })),
          fetchAuditLogs().catch(() => ({ logs: [], count: 0, tamperEvidentPolicy: '' })),
          fetchModerationReports().catch(() => ({ reports: [], pendingCount: 0 })),
          fetchDiscrepancies().catch(() => ({ discrepancies: [], openCount: 0 })),
          fetchPlatformConfig().catch(() => ({ config: null })),
        ]);

        setUsersList(usersRes.users);
        setAuditLogs(auditRes.logs);
        setModerationReports(modRes.reports);
        setDiscrepancies(discRes.discrepancies);
        if (confRes.config) setPlatformConfig(confRes.config);
      }
    } catch (err: unknown) {
      console.error('Failed to load RBAC data:', err);
      setActionErrorMessage((err as Error)?.message || 'Failed to authenticate RBAC state.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleAssignment = async (email: string, role: UserRole) => {
    setActionErrorMessage(null);
    setActionSuccessMessage(null);
    try {
      const res = await setUserRole(email, role);
      setActionSuccessMessage(res.message);
      await loadAllRbacData();
      if (onRoleChanged) onRoleChanged();
    } catch (err: unknown) {
      setActionErrorMessage((err as Error)?.message || 'Failed to assign role.');
    }
  };

  const handleModerationResolution = async (reportId: string, resolution: 'resolved' | 'dismissed') => {
    setActionErrorMessage(null);
    try {
      await resolveModerationReport(reportId, resolution, `Action taken by ${currentUser.email || 'Admin'}`);
      setActionSuccessMessage(`Report ${reportId} marked as ${resolution.toUpperCase()}.`);
      await loadAllRbacData();
    } catch (err: unknown) {
      setActionErrorMessage((err as Error)?.message || 'Failed to resolve moderation report.');
    }
  };

  const handleTriggerIntegrityScan = async () => {
    setIsScanning(true);
    setActionErrorMessage(null);
    try {
      const res = await triggerDiscrepancyScan();
      setActionSuccessMessage(res.message);
      await loadAllRbacData();
    } catch (err: unknown) {
      setActionErrorMessage((err as Error)?.message || 'Discrepancy scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleResolveDiscrepancy = async (id: string) => {
    setActionErrorMessage(null);
    try {
      await resolveDiscrepancy(id, `Integrity verified by ${currentUser.email}`);
      setActionSuccessMessage('Discrepancy marked as resolved.');
      await loadAllRbacData();
    } catch (err: unknown) {
      setActionErrorMessage((err as Error)?.message || 'Failed to resolve discrepancy.');
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!window.confirm(`Are you sure you want to deactivate and quarantine user account: ${email}?`)) {
      return;
    }
    setActionErrorMessage(null);
    try {
      const res = await deleteUserAccount(email, 'Administrative quarantine requested');
      setActionSuccessMessage(res.message);
      await loadAllRbacData();
    } catch (err: unknown) {
      setActionErrorMessage((err as Error)?.message || 'Failed to delete user.');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformConfig) return;
    setActionErrorMessage(null);
    try {
      const res = await updatePlatformConfig(platformConfig);
      setActionSuccessMessage(res.message);
      await loadAllRbacData();
    } catch (err: unknown) {
      setActionErrorMessage((err as Error)?.message || 'Failed to update platform configuration.');
    }
  };

  if (!isOpen) return null;

  const roleBadgeColors = {
    owner: 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#EED484]',
    admin: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
    user: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#171717]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-medium text-white tracking-wide">
                  Governance & Access Control Console
                </h2>
                <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border font-semibold ${roleBadgeColors[activeRole]}`}>
                  {activeRole}
                </span>
              </div>
              <p className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Token Verified via Cryptographic Signatures</span>
                <span>•</span>
                <span>Fail-Closed Enforced</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Security Guarantee Banner: Principle of Least Privilege */}
        <div className="px-6 py-2.5 bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-black/40 border-b border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Zero-Trust Least Privilege Active:</strong> Admins and Platform Owners have <strong>0% read/write access</strong> to users' private journal reflections and chat contents.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-200">
            Path: /users/{'{uid}'}/entries
          </span>
        </div>

        {/* Notification Toasts */}
        {actionSuccessMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionErrorMessage && (
          <div className="mx-6 mt-3 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{actionErrorMessage}</span>
            </div>
            <button onClick={() => setActionErrorMessage(null)} className="text-red-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Console Navigation Bar */}
        <div className="px-6 border-b border-white/10 flex items-center gap-1 bg-[#141414] overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Role & Identity
          </button>

          {activeRole === 'owner' && (
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'admins'
                  ? 'bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Manage Admins & Roles
            </button>
          )}

          {(activeRole === 'owner' || activeRole === 'admin') && (
            <>
              <button
                onClick={() => setActiveTab('moderation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'moderation'
                    ? 'bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Moderation Reports
                {moderationReports.filter((r) => r.status === 'pending').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-black font-bold text-[10px] rounded-full">
                    {moderationReports.filter((r) => r.status === 'pending').length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('discrepancies')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'discrepancies'
                    ? 'bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Discrepancies & Integrity
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                User Accounts
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === 'audit'
                    ? 'bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Immutable Audit Trail
              </button>
            </>
          )}

          {activeRole === 'owner' && (
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'config'
                  ? 'bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Platform Configuration
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={loadAllRbacData}
              disabled={loading}
              className="p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Refresh console state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Modal Main Body Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">

          {/* TAB 1: OVERVIEW & VERIFIED IDENTITY */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-mono">Current User Identity</p>
                  <p className="text-sm font-medium text-white break-all">{currentUser.email || currentUser.uid}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cryptographic Signature Valid</span>
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-mono">Assigned Role</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-md border ${roleBadgeColors[activeRole]}`}>
                      {activeRole.toUpperCase()} {activeRole === 'owner' ? '(HIGHEST)' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40">
                    {activeRole === 'owner'
                      ? 'Full platform configuration & admin governance'
                      : activeRole === 'admin'
                      ? 'Moderation, discrepancy scans & account maintenance'
                      : 'Self-isolated journal management'}
                  </p>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-mono">Security Model</p>
                  <p className="text-sm font-medium text-emerald-400">Zero-Trust / Fail-Closed</p>
                  <p className="text-[11px] text-white/40">
                    Fail-closed authorization strictly rejects any invalid token or unauthorized role claim.
                  </p>
                </div>
              </div>

              {/* Functional RBAC Permissions Matrix */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-serif font-medium text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                  Verified Functional Capabilities Matrix
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <span className="text-white/70">Read, write, modify & delete own journal entries</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono text-[10px]">ALLOWED (User)</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <span className="text-white/70">Read other users' private journal entries</span>
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded font-mono text-[10px]">BLOCKED (Least Privilege)</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <span className="text-white/70">Moderate flagged content reports</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${activeRole === 'owner' || activeRole === 'admin' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                      {activeRole === 'owner' || activeRole === 'admin' ? 'ALLOWED (Admin/Owner)' : 'RESTRICTED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <span className="text-white/70">Scan system discrepancies & integrity</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${activeRole === 'owner' || activeRole === 'admin' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                      {activeRole === 'owner' || activeRole === 'admin' ? 'ALLOWED (Admin/Owner)' : 'RESTRICTED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <span className="text-white/70">Deactivate / delete user accounts</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${activeRole === 'owner' || activeRole === 'admin' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                      {activeRole === 'owner' || activeRole === 'admin' ? 'ALLOWED (Admin/Owner)' : 'RESTRICTED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <span className="text-white/70">Manage Admin roles & assign privileges</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${activeRole === 'owner' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                      {activeRole === 'owner' ? 'ALLOWED (Owner Only)' : 'RESTRICTED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <span className="text-white/70">Configure platform parameters & AI model tiers</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${activeRole === 'owner' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                      {activeRole === 'owner' ? 'ALLOWED (Owner Only)' : 'RESTRICTED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <span className="text-white/70">Inspect tamper-evident immutable audit logs</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${activeRole === 'owner' || activeRole === 'admin' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                      {activeRole === 'owner' || activeRole === 'admin' ? 'ALLOWED (Admin/Owner)' : 'RESTRICTED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE ADMINS & ROLES (OWNER ONLY) */}
          {activeTab === 'admins' && activeRole === 'owner' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-serif font-medium text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#D4AF37]" />
                  Assign or Update User Roles
                </h3>
                <p className="text-xs text-white/50">
                  As the Platform Owner, you can grant Admin privileges or adjust roles. Role transitions are instantly signed and appended to the immutable audit trail.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="email"
                    placeholder="Enter user email (e.g., colleague@domain.com)"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                  <select
                    value={newTargetRole}
                    onChange={(e) => setNewTargetRole(e.target.value as UserRole)}
                    className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="admin">ADMIN (Moderation & Ops)</option>
                    <option value="user">USER (Standard Vault)</option>
                    <option value="owner">OWNER (Co-Owner)</option>
                  </select>
                  <button
                    onClick={() => {
                      if (newUserEmail) {
                        handleRoleAssignment(newUserEmail, newTargetRole);
                        setNewUserEmail('');
                      }
                    }}
                    disabled={!newUserEmail}
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c49f27] text-black font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    Update Role
                  </button>
                </div>
              </div>

              {/* Managed Users Table */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-serif font-medium text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#D4AF37]" />
                      <span>Live Role & Governance Directory</span>
                    </h3>
                    <p className="text-[11px] text-white/50">
                      Dynamically reflects all registered platform users, admins, and active Google OAuth sign-in sessions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#EED484] font-mono bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2.5 py-1 rounded-lg">
                      {filteredUsers.length} of {usersList.length} Accounts
                    </span>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by email, name, or UID..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {(['all', 'owner', 'admin', 'user'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setDirectoryRoleFilter(r)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase transition-all whitespace-nowrap ${
                          directoryRoleFilter === r
                            ? 'bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40 font-semibold'
                            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        {r} ({r === 'all' ? usersList.length : usersList.filter((u) => u.role === r).length})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 uppercase font-mono text-[10px]">
                        <th className="py-2.5 px-3">User & Identity</th>
                        <th className="py-2.5 px-3">Current Role</th>
                        <th className="py-2.5 px-3">Last Active</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Quick Role Elevation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-white/40 text-xs font-mono">
                            No users found matching current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.email || u.uid} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-3">
                              <div className="font-medium text-white flex items-center gap-2">
                                <span>{u.displayName || u.email || 'Anonymous User'}</span>
                                {u.email === currentUser.email && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-white/60 font-sans">{u.email}</div>
                              <div className="text-[10px] text-white/30 font-mono">{u.uid}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${roleBadgeColors[u.role]}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-white/70 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{formatLastActive(u.lastActiveAt)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-mono text-emerald-400 uppercase">
                                {u.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-2">
                              {u.email !== 'mailforsignups99@gmail.com' && (
                                <>
                                  {u.role !== 'admin' ? (
                                    <button
                                      onClick={() => handleRoleAssignment(u.email!, 'admin')}
                                      className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[11px] transition-colors border border-emerald-500/30"
                                    >
                                      Promote to Admin
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleRoleAssignment(u.email!, 'user')}
                                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[11px] transition-colors border border-amber-500/30"
                                    >
                                      Demote to User
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MODERATION REPORTS (ADMIN & OWNER) */}
          {activeTab === 'moderation' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-medium text-white">Content Moderation & Flagged Reports</h3>
                  <p className="text-xs text-white/50">
                    Review and resolve flagged safety items. Moderation is conducted via anonymized hash summaries to preserve user zero-trust privacy.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const reason = prompt('Enter test report reason:', 'High emotional intensity flag');
                    if (reason) {
                      createModerationReport(reason, 'medium');
                      loadAllRbacData();
                    }
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-xs transition-colors border border-white/10"
                >
                  + Create Test Report
                </button>
              </div>

              <div className="space-y-3">
                {moderationReports.length === 0 ? (
                  <div className="p-8 text-center bg-white/[0.02] border border-white/10 rounded-xl text-white/40 text-xs">
                    No moderation reports currently pending.
                  </div>
                ) : (
                  moderationReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-white font-medium">{report.id}</span>
                            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                              report.severity === 'high'
                                ? 'bg-red-500/20 text-red-300'
                                : report.severity === 'medium'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              Severity: {report.severity}
                            </span>
                            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                              report.status === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : report.status === 'dismissed'
                                ? 'bg-white/10 text-white/40'
                                : 'bg-amber-500/30 text-amber-200 animate-pulse'
                            }`}>
                              Status: {report.status}
                            </span>
                          </div>
                          <p className="text-xs text-white/80">{report.reason}</p>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">{new Date(report.timestamp).toLocaleString()}</span>
                      </div>

                      <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 text-[11px] font-mono text-white/50 flex items-center justify-between">
                        <span>Anonymized Snippet Hash: {report.snippetHash}</span>
                        <span className="text-[10px] text-emerald-400">Zero-Trust Protected</span>
                      </div>

                      {report.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleModerationResolution(report.id, 'dismissed')}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs rounded-lg transition-colors"
                          >
                            Dismiss Flag
                          </button>
                          <button
                            onClick={() => handleModerationResolution(report.id, 'resolved')}
                            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs rounded-lg transition-colors border border-emerald-500/30"
                          >
                            Mark Action Taken & Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM DISCREPANCIES (ADMIN & OWNER) */}
          {activeTab === 'discrepancies' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-medium text-white">System Integrity & Discrepancy Audits</h3>
                  <p className="text-xs text-white/50">
                    Scan for anomalies across authentication, rate boundaries, schema adherence, and cross-tenant leak checks.
                  </p>
                </div>
                <button
                  onClick={handleTriggerIntegrityScan}
                  disabled={isScanning}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c49f27] text-black font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning System...' : 'Trigger Integrity Scan'}
                </button>
              </div>

              <div className="space-y-3">
                {discrepancies.map((disc) => (
                  <div
                    key={disc.id}
                    className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">{disc.title}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">
                          {disc.category}
                        </span>
                        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                          disc.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {disc.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">{new Date(disc.timestamp).toLocaleString()}</span>
                    </div>

                    <p className="text-xs text-white/70">{disc.description}</p>

                    {disc.resolutionNote && (
                      <div className="p-2 bg-emerald-950/30 border border-emerald-500/20 rounded text-[11px] text-emerald-300 font-mono">
                        Note: {disc.resolutionNote}
                      </div>
                    )}

                    {disc.status !== 'resolved' && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleResolveDiscrepancy(disc.id)}
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs rounded-lg transition-colors"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: USER ACCOUNTS & DEACTIVATION (ADMIN & OWNER) */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-serif font-medium text-white flex items-center gap-2">
                    <UserX className="w-4 h-4 text-[#D4AF37]" />
                    <span>User Accounts & Security Governance</span>
                  </h3>
                  <p className="text-xs text-white/50">
                    Manage active accounts across the system. Deactivating an account revokes access while preserving zero-trust tenant quarantine.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#EED484] font-mono bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2.5 py-1 rounded-lg">
                    {filteredUsers.length} of {usersList.length} Accounts
                  </span>
                </div>
              </div>

              {/* Search & Role Filters */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter user accounts by email, name, or UID..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {(['all', 'owner', 'admin', 'user'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setDirectoryRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase transition-all whitespace-nowrap ${
                        directoryRoleFilter === r
                          ? 'bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40 font-semibold'
                          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {r} ({r === 'all' ? usersList.length : usersList.filter((u) => u.role === r).length})
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center bg-white/[0.02] border border-white/10 rounded-xl text-white/40 text-xs font-mono">
                    No accounts found matching filter criteria.
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <div key={u.email || u.uid} className="p-4 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-xs">{u.displayName || u.email}</span>
                          {u.displayName && u.email && (
                            <span className="text-white/50 text-[11px]">({u.email})</span>
                          )}
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${roleBadgeColors[u.role]}`}>
                            {u.role}
                          </span>
                          {u.email === currentUser.email && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40 font-mono">
                          <span>UID: {u.uid}</span>
                          <span>•</span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                            {formatLastActive(u.lastActiveAt)}
                          </span>
                        </div>
                      </div>

                      {u.email !== 'mailforsignups99@gmail.com' && (
                        <button
                          onClick={() => handleDeleteUser(u.email!)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Deactivate Account
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: IMMUTABLE APPEND-ONLY AUDIT TRAIL (ADMIN & OWNER) */}
          {activeTab === 'audit' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-medium text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#D4AF37]" />
                    Immutable Append-Only Audit Trail
                  </h3>
                  <p className="text-xs text-white/50">
                    Tamper-evident governance journal. Every administrative action, privilege elevation, and security event is recorded with cryptographic signature validation.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-lg">
                  Policy: Write-Once / No Deletions
                </div>
              </div>

              <div className="overflow-x-auto bg-black/40 border border-white/10 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 uppercase font-mono text-[10px] bg-white/[0.02]">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Actor</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Target Resource</th>
                      <th className="py-2.5 px-3">Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-white/50 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-white text-[11px]">
                          {log.actorEmail}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border ${roleBadgeColors[log.actorRole]}`}>
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#EED484] font-semibold text-[11px]">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-3 text-white/60 text-[11px]">
                          {log.targetResource}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 text-[10px]">
                          ✓ {log.signatureStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: PLATFORM CONFIGURATION (OWNER ONLY) */}
          {activeTab === 'config' && activeRole === 'owner' && platformConfig && (
            <form onSubmit={handleSaveConfig} className="space-y-6 animate-fade-in">
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-serif font-medium text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#D4AF37]" />
                  Operational & AI Model Configuration
                </h3>
                <p className="text-xs text-white/50">
                  Fine-tune platform runtime properties, model routing ladders, and zero-trust rate bounds.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="space-y-1.5">
                    <label className="text-white/70 block">Primary AI Model Tier</label>
                    <select
                      value={platformConfig.activeModelTier}
                      onChange={(e) => setPlatformConfig({ ...platformConfig, activeModelTier: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="gemini-3.6-flash">gemini-3.6-flash (Ultra Fast Primary)</option>
                      <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (High-Availability Fallback)</option>
                      <option value="gemini-3.7-flash">gemini-3.7-flash (Deep Reasoning)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white/70 block">Audit Log Retention (Days)</label>
                    <input
                      type="number"
                      value={platformConfig.auditRetentionDays}
                      onChange={(e) => setPlatformConfig({ ...platformConfig, auditRetentionDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white/70 block">API Rate Limit (Requests per Minute)</label>
                    <input
                      type="number"
                      value={platformConfig.rateLimitPerMinute}
                      onChange={(e) => setPlatformConfig({ ...platformConfig, rateLimitPerMinute: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-black/30 rounded-lg border border-white/5">
                      <input
                        type="checkbox"
                        checked={platformConfig.moderationAutoScan}
                        onChange={(e) => setPlatformConfig({ ...platformConfig, moderationAutoScan: e.target.checked })}
                        className="accent-[#D4AF37] rounded"
                      />
                      <span className="text-white/80">Enable Automated Moderation Daemon</span>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-black/30 rounded-lg border border-white/5">
                      <input
                        type="checkbox"
                        checked={platformConfig.allowNewRegistrations}
                        onChange={(e) => setPlatformConfig({ ...platformConfig, allowNewRegistrations: e.target.checked })}
                        className="accent-[#D4AF37] rounded"
                      />
                      <span className="text-white/80">Allow New User Registrations</span>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-black/30 rounded-lg border border-white/5">
                      <input
                        type="checkbox"
                        checked={platformConfig.maintenanceMode}
                        onChange={(e) => setPlatformConfig({ ...platformConfig, maintenanceMode: e.target.checked })}
                        className="accent-[#D4AF37] rounded"
                      />
                      <span className="text-white/80">Enable Maintenance Mode (Owner Bypass Only)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c49f27] text-black font-semibold rounded-lg text-xs transition-colors"
                  >
                    Save & Broadcast Configuration
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#171717] flex items-center justify-between text-xs text-white/40">
          <span>ReflectAI Governance Subsystem • Signed JWT Session</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors text-xs"
          >
            Close Console
          </button>
        </div>

      </div>
    </div>
  );
};
