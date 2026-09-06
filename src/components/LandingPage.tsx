import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  Lock,
  Brain,
  FileText,
  Clock,
  CheckCircle2,
  KeyRound,
  Database,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { GoogleGIcon } from './GoogleGIcon';

interface LandingPageProps {
  onSignIn: () => void;
  onDemoSignIn?: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onDemoSignIn,
  isLoading,
  error,
}) => {
  const [isSignInHovered, setIsSignInHovered] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://reflectai-secretsanctuary.ai.studio';
  const isReferrerError = error && (
    error.includes('Domain Not Authorized') ||
    error.includes('requests-from-referer') ||
    error.includes('blocked')
  );

  const handleCopyDomain = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${currentDomain}/*`);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col bg-[#0A0A0A] text-[#E5E5E5]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 max-w-5xl mx-auto text-center">
        {/* Security / Technology Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-sans tracking-widest uppercase mb-8 shadow-sm">
          <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Cloud Firestore User Isolation • Powered by Advanced AI Intelligence</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light text-white tracking-tight leading-[1.1] max-w-4xl mb-6">
          Your private, AI-augmented <span className="italic font-normal text-white/90">sanctuary</span> for deep reflection.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-white/50 max-w-2xl font-sans mb-10 leading-relaxed tracking-wide">
          Write multi-turn journal reflections, unpack complex thoughts with AI, extract actionable insights, and keep your entries strictly protected in your private Firestore vault.
        </p>

        {/* Sign In CTA & Error Diagnostics */}
        <div className="flex flex-col items-center gap-4 w-full max-w-xl">
          {error && (
            <div className="w-full p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-left space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-sans font-medium text-xs">
                <AlertTriangle className="w-4 h-4 text-[#D4AF37]" />
                <span>Google API Key HTTP Referrer Policy Notice</span>
              </div>

              <p className="text-xs text-white/80 leading-relaxed font-sans">
                {isReferrerError ? (
                  <>
                    Google Cloud Identity Toolkit blocked the request because your Google Cloud API key has website/HTTP referrer restrictions enabled, and this domain is not yet in the allowed list.
                  </>
                ) : (
                  error
                )}
              </p>

              {isReferrerError && (
                <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2 text-[11px] font-sans">
                  <div className="flex items-center justify-between text-white/60">
                    <span>Domain to authorize in Google Cloud:</span>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="inline-flex items-center gap-1 text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? 'Copied pattern!' : 'Copy pattern'}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded bg-white/5 font-mono text-xs text-[#EED484] break-all select-all">
                    {currentDomain}/*
                  </div>
                  <div className="text-[11px] text-white/60 space-y-1 pt-1">
                    <p>1. Go to <strong>Google Cloud Console</strong> &gt; <strong>APIs &amp; Services</strong> &gt; <strong>Credentials</strong> &gt; Click your Web API Key.</p>
                    <p>2. Under <strong>Application restrictions</strong>, add <code className="text-[#D4AF37]">{currentDomain}/*</code> (or set to <em>None</em> for development).</p>
                    <p>3. In <strong>Firebase Console</strong> &gt; <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong>, ensure <code className="text-[#D4AF37]">{currentDomain.replace(/^https?:\/\//, '')}</code> is added.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {onDemoSignIn && (
                  <button
                    type="button"
                    id="demo-login-bypass-btn"
                    onClick={onDemoSignIn}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#EED484] text-black font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Enter Sanctuary as Owner (Instant Preview)</span>
                  </button>
                )}
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-sans transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Full Browser Tab</span>
                </a>
              </div>
            </div>
          )}

          <div
            className="relative w-full max-w-sm"
            onMouseEnter={() => setIsSignInHovered(true)}
            onMouseLeave={() => setIsSignInHovered(false)}
          >
            <button
              id="google-signin-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[#D4AF37] hover:bg-[#EED484] text-black font-sans font-medium text-sm tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(212,175,55,0.25)] hover:shadow-[0_0_35px_rgba(212,175,55,0.4)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <GoogleGIcon className="w-5 h-5" />
                  <span>Continue with Google Sign-In</span>
                </>
              )}
            </button>

            {/* Hover Floating Panel */}
            {isSignInHovered && (
              <div
                id="signin-hover-preview-panel"
                className="absolute left-1/2 -translate-x-1/2 -top-24 w-72 sm:w-80 p-3 rounded-xl bg-[#0D0D0D]/95 backdrop-blur-md border border-[#D4AF37]/30 shadow-2xl z-30 text-left animate-in fade-in zoom-in-95 pointer-events-none"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#D4AF37] font-sans font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Google Federated Vault</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Zero Passwords
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed font-sans">
                  Instant, passwordless OAuth 2.0 authentication. Your reflections are isolated and encrypted in your personal Firestore vault.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-white/40 font-sans">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#D4AF37]" />
              <span>Passwordless federated identity.</span>
            </span>
            {onDemoSignIn && !error && (
              <>
                <span>•</span>
                <button
                  type="button"
                  id="preview-quick-access-btn"
                  onClick={onDemoSignIn}
                  className="text-[#D4AF37] hover:underline cursor-pointer"
                >
                  Quick Owner Preview Mode
                </button>
              </>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 sm:mt-24 text-left w-full">
          <div className="p-7 rounded-2xl bg-[#0D0D0D] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#D4AF37] mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-normal text-white mb-2">Multi-Turn AI Reflections</h3>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                Have rich, contextual back-and-forth conversations with AI. Brainstorm solutions, challenge assumptions, and extract structured action items.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1.5 text-xs text-[#D4AF37] font-sans tracking-wide uppercase">
              <span>Automatic Fallback</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          <div className="p-7 rounded-2xl bg-[#0D0D0D] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-normal text-white mb-2">Strict Firestore Isolation</h3>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                Every reflection is strictly isolated to your authenticated UID via owner-bound Firestore security rules. Other users cannot access or view your entries.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1.5 text-xs text-emerald-400 font-sans tracking-wide uppercase">
              <span>Owner-Bound Path Rules</span>
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>

          <div className="p-7 rounded-2xl bg-[#0D0D0D] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-normal text-white mb-2">Automated Syntheses & History</h3>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                AI automatically identifies mood patterns, extracts key themes, and creates session summaries so you can browse and reflect on your growth over time.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1.5 text-xs text-blue-400 font-sans tracking-wide uppercase">
              <span>Search & Mood Filtering</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-xs text-white/40 font-sans">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ReflectAI. Secure Personal Reflection Sanctuary.</p>
          <div className="flex items-center gap-4 text-white/50">
            <span>Firebase Auth</span>
            <span>•</span>
            <span>Cloud Firestore</span>
            <span>•</span>
            <span>Advanced AI API (Server-Side)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
