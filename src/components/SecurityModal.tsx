import React from 'react';
import { X, ShieldCheck, Lock, Key, Server, Database, Check } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 text-[#E5E5E5]">
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/5 text-[#D4AF37] border border-white/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-light text-white tracking-wide">Security & Isolation Architecture</h2>
              <p className="text-xs text-white/40 font-sans tracking-wide">Threat modeling & data isolation guarantees</p>
            </div>
          </div>
          <button
            id="close-security-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Status */}
        {userId && (
          <div className="mt-5 p-3.5 rounded-xl bg-[#0A0A0A] border border-white/10 flex items-center justify-between text-xs font-sans">
            <span className="text-white/40 tracking-wide uppercase text-[11px]">Authenticated Storage Path:</span>
            <span className="font-mono text-[#D4AF37]">/users/{userId}/entries/*</span>
          </div>
        )}

        {/* Threat Summary Table */}
        <div className="mt-6">
          <h3 className="text-xs font-sans tracking-widest uppercase text-white/60 mb-3 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Threat Summary & Countermeasures Matrix</span>
          </h3>

          <div className="overflow-x-auto border border-white/10 rounded-xl">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="bg-[#0A0A0A] text-white/80 border-b border-white/10 tracking-wider uppercase text-[11px]">
                  <th className="p-3.5 font-medium">Threat Zone</th>
                  <th className="p-3.5 font-medium">Vulnerability Vector</th>
                  <th className="p-3.5 font-medium">Mitigation Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/50">
                <tr>
                  <td className="p-3.5 font-medium text-white/90">1. Input Surfaces</td>
                  <td className="p-3.5">Prompt injection, payload tampering, XSS injection</td>
                  <td className="p-3.5 text-[#D4AF37]">Strict schema parsing, defensive null-safe destructuring, markdown sanitization</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white/90">2. Planning & Reasoning</td>
                  <td className="p-3.5">System instruction hijacking & prompt bypass</td>
                  <td className="p-3.5 text-[#D4AF37]">Context separation with explicit system instruction boundaries</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white/90">3. Tool Execution</td>
                  <td className="p-3.5">Client-side API key scraping, unauthorized endpoints</td>
                  <td className="p-3.5 text-[#D4AF37]">Server-side proxy routes (/api/*), API keys stored in server env only</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white/90">4. Memory & State</td>
                  <td className="p-3.5">Cross-user data leakage, unauthorized reads/writes</td>
                  <td className="p-3.5 text-emerald-400">Firestore owner-bound security rules (request.auth.uid == userId)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white/90">5. Inter-System Comm</td>
                  <td className="p-3.5">API outages, rate limits (429, 503), token interception</td>
                  <td className="p-3.5 text-emerald-400">Multi-tier model fallback ladder with automated resilience &amp; latency recovery</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-white/90">6. Geolocation & Maps</td>
                  <td className="p-3.5">Maps API key leakage, tenant location sniffing, quota exhaustion</td>
                  <td className="p-3.5 text-[#D4AF37]">Server-side proxy (/api/maps/*), TTL geocache, minimal coordinates footprint, owner-bound isolation</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Rule verification */}
        <div className="mt-6 p-4 rounded-xl bg-[#0A0A0A] border border-white/10">
          <p className="text-xs font-sans tracking-widest uppercase text-white/60 mb-2.5 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Deployed Firestore Security Rules</span>
          </p>
          <pre className="text-[11px] font-mono text-emerald-300/90 bg-[#050505] p-3 rounded-lg overflow-x-auto border border-white/5">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}
          </pre>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-sans uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
