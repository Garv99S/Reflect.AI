import React, { useState, useEffect, useCallback } from 'react';
import { onAuthChange, signInWithGoogle, signOut, subscribeToUserEntries } from './lib/firebase';
import type { UserProfile, JournalEntry, UserRole } from './types';
import { fetchUserRoleAndPermissions } from './lib/rbacApi';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { SecurityModal } from './components/SecurityModal';
import { RbacConsoleModal } from './components/RbacConsoleModal';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [authLoading, setAuthLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);
  const [entriesCount, setEntriesCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Monitor fullscreen change events from browser or F11/Esc
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (_) {}
      setIsFullscreen(true);
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (_) {}
      setIsFullscreen(false);
    }
  };

  const refreshUserRole = useCallback(async (currentUser: UserProfile | null) => {
    if (!currentUser) {
      setUserRole('user');
      return;
    }
    try {
      // Check if this is the designated primary platform owner
      if (currentUser.email?.toLowerCase() === 'mailforsignups99@gmail.com') {
        setUserRole('owner');
      }
      const roleData = await fetchUserRoleAndPermissions();
      if (roleData?.user?.role) {
        setUserRole(roleData.user.role);
      }
    } catch (e) {
      console.warn('Could not sync remote RBAC claim, applying local verified whitelist:', e);
      if (currentUser.email?.toLowerCase() === 'mailforsignups99@gmail.com') {
        setUserRole('owner');
      } else {
        setUserRole('user');
      }
    }
  }, []);

  // Monitor Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      setUser(currentUser);
      await refreshUserRole(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [refreshUserRole]);

  // Monitor entries count for active user
  useEffect(() => {
    if (!user?.uid) {
      setEntriesCount(0);
      return;
    }

    const unsubscribe = subscribeToUserEntries(
      user.uid,
      (entries: JournalEntry[]) => {
        setEntriesCount(entries.length);
      },
      (err) => console.error('Error fetching count:', err)
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleDemoSignIn = () => {
    const demoUser: UserProfile = {
      uid: 'demo-owner-sanctuary',
      email: 'mailforsignups99@gmail.com',
      displayName: 'Sanctuary Owner (Preview)',
      photoURL: undefined,
    };
    setUser(demoUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('reflectai_auth_token', 'demo-token');
    }
    setUserRole('owner');
    setAuthError(null);
  };

  const handleSignIn = async () => {
    try {
      setSignInLoading(true);
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      const firebaseError = err as { code?: string; message?: string };
      const msg = firebaseError?.message || '';
      if (firebaseError?.code === 'auth/popup-closed-by-user') {
        setAuthError('The sign-in window was closed before completing. If you did not close it, please ensure popups are allowed or open the app in a new tab.');
      } else if (firebaseError?.code === 'auth/popup-blocked') {
        setAuthError('The sign-in popup was blocked by your browser. Please allow popups for this page or open the application in a new browser tab.');
      } else if (firebaseError?.code === 'auth/cancelled-popup-request') {
        setAuthError(null);
      } else if (
        firebaseError?.code?.includes('requests-from-referer') ||
        firebaseError?.code?.includes('unauthorized-domain') ||
        msg.includes('requests-from-referer') ||
        msg.includes('blocked')
      ) {
        setAuthError(`Domain Not Authorized: Firebase Auth API Key has website restrictions blocking requests from ${window.location.origin}.`);
      } else {
        setAuthError(firebaseError?.message || 'Failed to sign in with Google');
      }
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setUserRole('user');
    } catch (err: unknown) {
      console.error('Sign-out error:', err);
    }
  };

  const [newEntryTrigger, setNewEntryTrigger] = useState(0);

  const handleNewEntry = () => {
    setNewEntryTrigger((prev) => prev + 1);
    window.dispatchEvent(new CustomEvent('new-reflection-trigger'));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-[#E5E5E5]">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif text-sm tracking-wide text-white/50">Loading ReflectAI Sanctuary...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-[#0A0A0A] font-sans text-[#E5E5E5] antialiased selection:bg-[#D4AF37]/30 selection:text-[#EED484] ${user ? 'h-screen max-h-screen overflow-hidden' : ''}`}>
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenRbacConsole={() => setIsRbacModalOpen(true)}
        activeRole={userRole}
        activeEntriesCount={entriesCount}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <div className={`flex-1 flex flex-col min-h-0 ${user ? 'overflow-hidden h-full' : ''}`}>
        {!user ? (
          <LandingPage
            onSignIn={handleSignIn}
            onDemoSignIn={handleDemoSignIn}
            isLoading={signInLoading}
            error={authError}
          />
        ) : (
          <Dashboard
            user={user}
            newEntryTrigger={newEntryTrigger}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onSignOut={handleSignOut}
            onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
            onOpenRbacConsole={() => setIsRbacModalOpen(true)}
            activeRole={userRole}
          />
        )}
      </div>

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        userId={user?.uid}
      />

      {user && (
        <RbacConsoleModal
          isOpen={isRbacModalOpen}
          onClose={() => setIsRbacModalOpen(false)}
          currentUser={user}
          activeRole={userRole}
          onRoleChanged={() => refreshUserRole(user)}
        />
      )}
    </div>
  );
}

