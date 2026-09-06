import React, { useState, useRef } from 'react';
import {
  Sparkles,
  LogOut,
  ShieldCheck,
  Shield,
  Plus,
  BookOpen,
  Info,
  Lock,
  User as UserIcon,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { UserProfile, UserRole } from '../types';
import { GoogleGIcon } from './GoogleGIcon';

interface NavbarProps {
  user: UserProfile | null;
  onSignOut: () => void;
  onOpenSecurityModal: () => void;
  onOpenRbacConsole?: () => void;
  activeRole?: UserRole;
  activeEntriesCount: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onOpenSecurityModal,
  onOpenRbacConsole,
  activeRole = 'user',
  activeEntriesCount,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowUserDropdown(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowUserDropdown(false);
    }, 120);
  };

  const roleBadgeStyle: Record<UserRole, string> = {
    owner: 'text-[#EED484] bg-[#D4AF37]/20 border-[#D4AF37]/50 hover:bg-[#D4AF37]/30',
    admin: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30',
    user: 'text-blue-300 bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30',
  };


  return (
    <header className="sticky top-0 z-30 h-16 sm:h-20 bg-[#0A0A0A] border-b border-white/10 text-[#E5E5E5] px-3 sm:px-8 flex items-center justify-between shrink-0">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-tr from-[#D4AF37] to-[#8E793E] rounded-sm transform rotate-45 shadow-[0_0_15px_rgba(212,175,55,0.2)] shrink-0"></div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif text-lg sm:text-2xl font-light tracking-[0.15em] sm:tracking-[0.2em] text-white uppercase truncate">
              Reflect<span className="text-[#D4AF37]">AI</span>
            </span>
            <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-sans tracking-[0.15em] uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
              <Lock className="w-2.5 h-2.5 text-[#D4AF37]" />
              Private Vault
            </span>
          </div>
        </div>

        {/* Actions & Profile */}
        {user ? (
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            <span className="hidden lg:inline font-sans text-xs tracking-wider uppercase text-white/40">
              {activeEntriesCount} {activeEntriesCount === 1 ? 'Entry' : 'Entries'}
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* RBAC Console Quick Access Button */}
              {onOpenRbacConsole && (
                <button
                  id="navbar-rbac-btn"
                  onClick={onOpenRbacConsole}
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-mono uppercase font-semibold transition-all cursor-pointer ${roleBadgeStyle[activeRole]}`}
                  title="Open Governance & RBAC Console"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{activeRole.toUpperCase()}</span>
                </button>
              )}

              {/* Full Screen Button on Current Screen */}
              {onToggleFullscreen && (
                <button
                  id="navbar-fullscreen-btn"
                  onClick={onToggleFullscreen}
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-sans tracking-wider uppercase transition-colors cursor-pointer shrink-0 ${
                    isFullscreen
                      ? 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border-[#D4AF37]/40 text-[#D4AF37]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
                  }`}
                  title={isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}
                  aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  )}
                  <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}</span>
                </button>
              )}

              <button
                id="security-info-btn"
                onClick={onOpenSecurityModal}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-sans tracking-wider uppercase transition-colors cursor-pointer shrink-0"
                title="View Security & Privacy architecture"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden md:inline">Security</span>
              </button>

              {/* User Profile / Menu with Dynamic Role Badge in place of Google Vault */}
              <div
                className="relative border-l border-white/10 pl-2 sm:pl-3"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="User menu"
                >
                  <div className="text-right hidden md:block">
                    <p className="text-xs font-sans font-medium text-white/90 truncate max-w-[110px]">
                      {user.displayName || user.email || 'User'}
                    </p>
                    <p className="text-[9px] font-sans uppercase tracking-wider font-mono flex items-center justify-end gap-1">
                      <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${roleBadgeStyle[activeRole]}`}>
                        ROLE: {activeRole.toUpperCase()}
                      </span>
                    </p>
                  </div>

                  <div className="relative shrink-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-white/10 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center font-sans text-xs text-white/70 shrink-0">
                        {(user.displayName || user.email || 'U').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Google Signed In Icon Badge - visible in every screen size */}
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0D0D0D] border border-white/20 flex items-center justify-center p-0.5 shadow-sm"
                      title="Signed in with Google"
                    >
                      <GoogleGIcon className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 sm:w-72 rounded-xl bg-[#0D0D0D] border border-white/10 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-3 border-b border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center p-0.5">
                            <GoogleGIcon className="w-3 h-3" />
                          </div>
                          <span className="text-[10px] font-sans font-medium text-white/60 tracking-wider uppercase">
                            Google Signed-In
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${roleBadgeStyle[activeRole]}`}>
                          {activeRole.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white/90 truncate">{user.displayName || 'Authenticated User'}</p>
                      <p className="text-[11px] text-white/40 truncate font-mono">{user.email}</p>
                      <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Signed JWT Valid</span>
                        </span>
                        <span className="text-white/40">UID: {user.uid.slice(0, 8)}...</span>
                      </div>
                    </div>

                    <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between text-xs text-white/40 font-sans">
                      <span className="text-[11px] tracking-wider uppercase">Saved Reflections</span>
                      <span className="font-semibold text-[#D4AF37]">{activeEntriesCount}</span>
                    </div>

                    {onOpenRbacConsole && (
                      <div className="p-1.5 border-b border-white/5">
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenRbacConsole();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-sans tracking-wide cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Governance & RBAC Console</span>
                        </button>
                      </div>
                    )}

                    <div className="p-1.5">
                      <button
                        id="sign-out-btn"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/30 rounded-lg transition-colors font-sans tracking-wide cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};
