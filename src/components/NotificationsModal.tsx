import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Shield,
  Trash2,
  RefreshCw,
  ExternalLink,
  Lock,
  Radio,
  Sliders,
  Sparkles,
  Info,
  Clock,
  Eye,
  Plus,
} from 'lucide-react';
import {
  NotificationChannelConfig,
  NotificationChannelType,
  NotificationPrivacyLevel,
  NotificationDeliveryLog,
  JournalEntry,
} from '../types';
import { getFreshAuthBearerToken } from '../lib/firebase';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEntry?: JournalEntry | null;
  authToken?: string;
  onNotificationDispatched?: (channelNames: string[]) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  activeEntry,
  authToken,
  onNotificationDispatched,
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'manual_dispatch' | 'logs' | 'directive'>('channels');
  const [channels, setChannels] = useState<NotificationChannelConfig[]>([]);
  const [logs, setLogs] = useState<NotificationDeliveryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);
  const [dispatchingManual, setDispatchingManual] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Edit channel modal/state
  const [editingChannel, setEditingChannel] = useState<NotificationChannelConfig | null>(null);
  const [webhookInput, setWebhookInput] = useState('');
  const [recipientEmailInput, setRecipientEmailInput] = useState('');
  const [newKeywordInput, setNewKeywordInput] = useState('');

  const getToken = async (): Promise<string> => {
    if (authToken) return authToken;
    return getFreshAuthBearerToken();
  };

  // Load Channels & Logs
  const loadNotificationData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [configRes, logsRes] = await Promise.all([
        fetch('/api/notifications/config', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/notifications/logs', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setChannels(configData.channels || []);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
    } catch (err) {
      console.error('Failed to load notification config:', err);
      setFeedbackMessage({ text: 'Could not connect to Notifications API.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotificationData();
      setFeedbackMessage(null);
    }
  }, [isOpen]);

  // Save Channel Config
  const handleSaveChannel = async (channelToSave: NotificationChannelConfig, rawWebhook?: string) => {
    try {
      const token = await getToken();
      const payload: any = {
        id: channelToSave.id,
        type: channelToSave.type,
        enabled: channelToSave.enabled,
        name: channelToSave.name,
        privacyLevel: channelToSave.privacyLevel,
        triggerRules: channelToSave.triggerRules,
        recipientEmail: channelToSave.recipientEmail,
      };

      if (rawWebhook !== undefined) {
        payload.webhookUrl = rawWebhook;
      }

      const res = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setChannels((prev) => prev.map((c) => (c.id === data.channel.id ? data.channel : c)));
        setEditingChannel(null);
        setWebhookInput('');
        setFeedbackMessage({ text: `Channel "${data.channel.name}" updated securely.`, type: 'success' });
      } else {
        const err = await res.json();
        setFeedbackMessage({ text: err.error || 'Failed to save channel config', type: 'error' });
      }
    } catch (e: any) {
      setFeedbackMessage({ text: e?.message || 'Error saving channel', type: 'error' });
    }
  };

  // Toggle channel enable status
  const handleToggleChannel = async (channel: NotificationChannelConfig) => {
    const updated = { ...channel, enabled: !channel.enabled };
    setChannels((prev) => prev.map((c) => (c.id === channel.id ? updated : c)));
    await handleSaveChannel(updated);
  };

  // Test Channel Dispatch
  const handleTestChannel = async (channelId: string) => {
    setTestingChannelId(channelId);
    setFeedbackMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channelId }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setFeedbackMessage({
          text: `Test notification sent successfully! (${data.deliveryStatus === 'delivered' ? 'Live Webhook Delivered' : 'Simulated Verification Pass'})`,
          type: 'success',
        });
        loadNotificationData();
      } else {
        setFeedbackMessage({
          text: `Test failed: ${data.error || 'Webhook upstream returned error'}`,
          type: 'error',
        });
      }
    } catch (e: any) {
      setFeedbackMessage({ text: `Test error: ${e.message}`, type: 'error' });
    } finally {
      setTestingChannelId(null);
    }
  };

  // Manual Dispatch for Current Reflection
  const handleManualDispatch = async (selectedChannelId?: string) => {
    if (!activeEntry) {
      setFeedbackMessage({ text: 'No active reflection selected to notify about.', type: 'info' });
      return;
    }

    setDispatchingManual(true);
    setFeedbackMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entryType: 'reflection',
          title: activeEntry.title || 'Untitled Reflection',
          summary: activeEntry.summary || (activeEntry.content ? activeEntry.content.slice(0, 180) : 'Reflection in Sanctuary'),
          mood: activeEntry.mood,
          keyThemes: activeEntry.keyThemes || [],
          insights: activeEntry.insights || [],
          contentSnippet: activeEntry.content,
          forceChannelId: selectedChannelId,
          isManualTrigger: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const count = data.dispatchedCount || 0;
        const reachedNames = Array.isArray(data.results) && data.results.length > 0
          ? data.results.map((r: any) => r.channelName).join(', ')
          : '';
        if (count > 0) {
          setFeedbackMessage({
            text: `Successfully dispatched notification to ${count} destination(s): ${reachedNames}.`,
            type: 'success',
          });
        } else {
          setFeedbackMessage({
            text: `0 destinations reached. Please verify that at least one channel (such as Discord) is marked "Active/Enabled".`,
            type: 'info',
          });
        }
        if (onNotificationDispatched && data.results) {
          onNotificationDispatched(data.results.map((r: any) => r.channelName));
        }
        loadNotificationData();
      } else {
        setFeedbackMessage({ text: data.error || 'Failed to dispatch notification', type: 'error' });
      }
    } catch (e: any) {
      setFeedbackMessage({ text: e.message || 'Dispatch network error', type: 'error' });
    } finally {
      setDispatchingManual(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="notifications-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="notifications-modal-dialog"
        className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-[#0D0D0D] border border-white/15 shadow-2xl flex flex-col overflow-hidden text-white font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-light text-white">External Notifications</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#EED484] font-mono">
                  Directive 10
                </span>
              </div>
              <p className="text-xs text-white/50">
                Slack, Discord & Email webhooks with zero-leakage payload schemas and server-side secret isolation
              </p>
            </div>
          </div>
          <button
            id="notifications-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 sm:px-5 border-b border-white/10 bg-white/[0.02] overflow-x-auto no-scrollbar shrink-0">
          <button
            id="notif-tab-channels"
            type="button"
            onClick={() => setActiveTab('channels')}
            className={`py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'channels'
                ? 'border-[#D4AF37] text-[#EED484]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Channels ({channels.length})</span>
          </button>

          <button
            id="notif-tab-manual-dispatch"
            type="button"
            onClick={() => setActiveTab('manual_dispatch')}
            className={`py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'manual_dispatch'
                ? 'border-[#D4AF37] text-[#EED484]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Notify Active Reflection</span>
          </button>

          <button
            id="notif-tab-logs"
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-[#D4AF37] text-[#EED484]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Delivery Logs ({logs.length})</span>
          </button>

          <button
            id="notif-tab-directive"
            type="button"
            onClick={() => setActiveTab('directive')}
            className={`py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'directive'
                ? 'border-[#D4AF37] text-[#EED484]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Security Directive & Schema</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl border flex items-center justify-between gap-3 text-xs shrink-0 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : feedbackMessage.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              {feedbackMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
              {feedbackMessage.type === 'info' && <Info className="w-4 h-4 shrink-0 text-sky-400" />}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-white/40 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: CHANNELS MANAGEMENT */}
          {activeTab === 'channels' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Configured External Destinations</h3>
                  <p className="text-xs text-white/40">
                    Outbound webhooks are triggered only when parsed reflections match your configured filters
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadNotificationData}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              </div>

              {channels.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl space-y-2">
                  <Radio className="w-8 h-8 text-white/30 mx-auto" />
                  <p className="text-sm text-white/60">No notification channels configured yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {channels.map((channel) => {
                    const isConfigured = channel.hasWebhookConfigured || channel.type === 'email';
                    return (
                      <div
                        key={channel.id}
                        id={`notif-channel-card-${channel.id}`}
                        className={`p-4 rounded-xl border transition-all ${
                          channel.enabled
                            ? 'bg-[#121212] border-[#D4AF37]/30 shadow-sm'
                            : 'bg-white/[0.02] border-white/10 opacity-80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                                channel.type === 'slack'
                                  ? 'bg-[#4A154B]/30 border-[#4A154B]/50 text-[#E01E5A]'
                                  : channel.type === 'discord'
                                  ? 'bg-[#5865F2]/20 border-[#5865F2]/40 text-[#5865F2]'
                                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              }`}
                            >
                              <span className="font-bold text-xs uppercase font-mono">{channel.type.slice(0, 3)}</span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-medium text-white">{channel.name}</h4>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
                                    channel.enabled
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-white/5 text-white/40 border border-white/10'
                                  }`}
                                >
                                  {channel.enabled ? 'Active' : 'Disabled'}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10 font-mono">
                                  Privacy: {channel.privacyLevel}
                                </span>
                              </div>

                              <div className="text-xs text-white/40 flex items-center gap-2 flex-wrap">
                                {channel.type === 'email' ? (
                                  <span>Recipient: {channel.recipientEmail || 'Default User Email'}</span>
                                ) : (
                                  <span className="font-mono text-[11px] text-white/50">
                                    Webhook:{' '}
                                    {channel.hasWebhookConfigured
                                      ? channel.webhookUrlMasked || '••••••••••••••••'
                                      : 'Not set (mock test mode)'}
                                  </span>
                                )}
                                <span>• Dispatched: {channel.totalDispatchedCount || 0} times</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              id={`toggle-channel-btn-${channel.id}`}
                              type="button"
                              onClick={() => handleToggleChannel(channel)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                                channel.enabled
                                  ? 'bg-white/10 hover:bg-white/15 text-white border-white/20'
                                  : 'bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30'
                              }`}
                            >
                              {channel.enabled ? 'Disable' : 'Enable'}
                            </button>

                            <button
                              id={`test-channel-btn-${channel.id}`}
                              type="button"
                              onClick={() => handleTestChannel(channel.id)}
                              disabled={testingChannelId === channel.id}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Send a secure test dispatch to verify delivery"
                            >
                              <Send className={`w-3 h-3 ${testingChannelId === channel.id ? 'animate-spin' : ''}`} />
                              <span>{testingChannelId === channel.id ? 'Testing...' : 'Test'}</span>
                            </button>

                            <button
                              id={`edit-channel-btn-${channel.id}`}
                              type="button"
                              onClick={() => {
                                setEditingChannel(channel);
                                setWebhookInput('');
                                setRecipientEmailInput(channel.recipientEmail || '');
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                              title="Configure webhook credentials & triggers"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Trigger preview tags */}
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5 flex-wrap text-[11px] text-white/50">
                          <span className="text-white/30">Triggers:</span>
                          {channel.triggerRules.notifyOnAiSummary && (
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[#D4AF37] border border-[#D4AF37]/20">
                              AI Summary
                            </span>
                          )}
                          {channel.triggerRules.notifyOnHighStress && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                              High Stress / Overwhelm
                            </span>
                          )}
                          {channel.triggerRules.notifyOnBreakthrough && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              Breakthroughs & Wins
                            </span>
                          )}
                          {channel.triggerRules.notifyOnAgentReport && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              AI Agent Reports
                            </span>
                          )}
                          {channel.triggerRules.customKeywords?.map((kw) => (
                            <span key={kw} className="px-1.5 py-0.5 rounded bg-white/5 text-white/70 border border-white/10">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL DISPATCH FOR ACTIVE REFLECTION */}
          {activeTab === 'manual_dispatch' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="text-sm font-medium">Active Reflection Dispatch Preview</h3>
                </div>

                {activeEntry ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-lg bg-[#0A0A0A] border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-sm sm:text-base text-white font-medium">
                          {activeEntry.title || 'Untitled Reflection'}
                        </h4>
                        {activeEntry.mood && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">
                            {activeEntry.mood}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 line-clamp-2">
                        {activeEntry.summary || activeEntry.content || 'No reflection text available.'}
                      </p>
                      {activeEntry.keyThemes && activeEntry.keyThemes.length > 0 && (
                        <div className="flex items-center gap-1 pt-1 flex-wrap">
                          {activeEntry.keyThemes.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/80">Configured Channel Routing:</span>
                        <button
                          id="dispatch-active-reflection-btn"
                          type="button"
                          onClick={() => handleManualDispatch()}
                          disabled={dispatchingManual || channels.filter((c) => c.enabled).length === 0}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#EED484] text-black font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <Send className={`w-3.5 h-3.5 ${dispatchingManual ? 'animate-spin' : ''}`} />
                          <span>{dispatchingManual ? 'Dispatching...' : `Dispatch to All Enabled (${channels.filter((c) => c.enabled).length})`}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {channels.map((ch) => (
                          <div
                            key={ch.id}
                            className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                              ch.enabled
                                ? 'bg-[#121212] border-white/15'
                                : 'bg-white/[0.02] border-white/5 opacity-60'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-white truncate">{ch.name}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                                    ch.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'
                                  }`}
                                >
                                  {ch.enabled ? 'Active' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/40 font-mono truncate">
                                {ch.type === 'email' ? ch.recipientEmail : (ch.hasWebhookConfigured ? 'Webhook Set' : 'No Webhook')}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleManualDispatch(ch.id)}
                              disabled={dispatchingManual || !ch.enabled}
                              className="w-full py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                            >
                              <Send className="w-3 h-3 text-[#D4AF37]" />
                              <span>Dispatch Direct</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/50">
                    No active reflection is currently open in the editor. Open a reflection from your sidebar to test manual notifications.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERY LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Outbound Webhook Audit Trail</h3>
                  <p className="text-xs text-white/40">Immutable log of recent dispatches and upstream status codes</p>
                </div>
                <button
                  type="button"
                  onClick={loadNotificationData}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 transition-colors"
                >
                  Refresh
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                  <Clock className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-xs text-white/50">No delivery logs recorded in this session.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              log.status === 'delivered'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : log.status === 'failed'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {log.status} ({log.statusCode || 200})
                          </span>
                          <span className="font-medium text-white">{log.channelName}</span>
                          <span className="text-white/40 text-[11px] font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-white/60">
                          <span className="text-white/40">Entry:</span> "{log.entryTitle}" •{' '}
                          <span className="text-white/40">Trigger:</span> {log.triggerReason}
                        </p>
                        {log.error && <p className="text-red-400 font-mono text-[11px]">{log.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SECURITY DIRECTIVE & MINIMAL SCHEMA */}
          {activeTab === 'directive' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20 space-y-2">
                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <Shield className="w-4 h-4" />
                  <h4 className="font-medium text-sm">Notification API Directive Architecture (Zero-Trust Standard)</h4>
                </div>
                <p className="text-white/70 leading-relaxed">
                  External webhook destinations (Slack, Discord, Email) operate under strict server-side tenant isolation.
                  Webhook tokens and URLs are never exposed in browser artifacts or stored in client-accessible Firestore documents.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-white">Standard Versioned Payload Schema (`2026-09-01`)</h4>
                <div className="p-3.5 rounded-xl bg-black border border-white/10 font-mono text-[11px] text-[#EED484] overflow-x-auto">
                  <pre>{`{
  "version": "2026-09-01",
  "entry_type": "reflection" | "ai_summary" | "agent_report",
  "title": "Weekly Strategy Breakthrough",
  "summary": "Synthesized 4 key milestones and defused cognitive distortion.",
  "timestamp": "2026-09-04T07:30:00.000Z",
  "entry_url": "https://ais-dev-...run.app",
  "mood": "Determined & Clear",
  "keyThemes": ["Career", "Mindset"],
  "insights": ["Restoring focus blocks increases code quality."],
  "privacy_level": "minimal" | "with_insights" | "full_preview"
}`}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Channel Edit / Configure Drawer Modal */}
        {editingChannel && (
          <div
            id="edit-channel-modal-backdrop"
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setEditingChannel(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-[#0D0D0D] border border-white/20 p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="font-serif text-base text-white">Configure {editingChannel.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  className="p-1 rounded text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Channel Name */}
                <div className="space-y-1">
                  <label className="text-white/60">Display Name</label>
                  <input
                    type="text"
                    value={editingChannel.name}
                    onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-white/15 text-white"
                  />
                </div>

                {/* Webhook URL (Secret Isolation) */}
                {editingChannel.type !== 'email' ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-white/60">
                        {editingChannel.type === 'slack' ? 'Slack Incoming Webhook URL' : 'Discord Webhook URL'}
                      </label>
                      {editingChannel.hasWebhookConfigured && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Webhook active server-side
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={webhookInput}
                      onChange={(e) => setWebhookInput(e.target.value)}
                      placeholder={
                        editingChannel.hasWebhookConfigured
                          ? 'Enter new URL to rotate/replace, or leave blank to keep existing'
                          : 'https://hooks.slack.com/services/...'
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-white/15 text-white font-mono text-xs placeholder:text-white/30"
                    />
                    <p className="text-[10px] text-white/40">
                      Credentials are stored exclusively server-side and never saved in client-readable documents.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-white/60">Recipient Email</label>
                    <input
                      type="email"
                      value={recipientEmailInput}
                      onChange={(e) => setRecipientEmailInput(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-white/15 text-white"
                    />
                  </div>
                )}

                {/* Privacy Tier */}
                <div className="space-y-1">
                  <label className="text-white/60">Privacy Level Tier</label>
                  <select
                    value={editingChannel.privacyLevel}
                    onChange={(e) =>
                      setEditingChannel({ ...editingChannel, privacyLevel: e.target.value as NotificationPrivacyLevel })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-white/15 text-white"
                  >
                    <option value="minimal">Minimal (Title + 2-line Summary only)</option>
                    <option value="with_insights">With Insights (Summary + Mood + Tag Takeaways)</option>
                    <option value="full_preview">Full Preview (Includes reflection excerpt snippet)</option>
                  </select>
                </div>

                {/* Trigger Rules */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <label className="text-white/60 font-medium">Trigger Filters</label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingChannel.triggerRules.notifyOnAiSummary}
                        onChange={(e) =>
                          setEditingChannel({
                            ...editingChannel,
                            triggerRules: { ...editingChannel.triggerRules, notifyOnAiSummary: e.target.checked },
                          })
                        }
                        className="rounded border-white/20 bg-white/5 text-[#D4AF37] focus:ring-0"
                      />
                      <span>Trigger when AI Summary & Sentiment are generated</span>
                    </label>

                    <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingChannel.triggerRules.notifyOnBreakthrough}
                        onChange={(e) =>
                          setEditingChannel({
                            ...editingChannel,
                            triggerRules: { ...editingChannel.triggerRules, notifyOnBreakthrough: e.target.checked },
                          })
                        }
                        className="rounded border-white/20 bg-white/5 text-[#D4AF37] focus:ring-0"
                      />
                      <span>Trigger on Breakthroughs, Wins & Gratitude states</span>
                    </label>

                    <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingChannel.triggerRules.notifyOnHighStress}
                        onChange={(e) =>
                          setEditingChannel({
                            ...editingChannel,
                            triggerRules: { ...editingChannel.triggerRules, notifyOnHighStress: e.target.checked },
                          })
                        }
                        className="rounded border-white/20 bg-white/5 text-[#D4AF37] focus:ring-0"
                      />
                      <span>Trigger on High Stress / Overwhelm alerts (Support Anchor)</span>
                    </label>

                    <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingChannel.triggerRules.notifyOnAgentReport}
                        onChange={(e) =>
                          setEditingChannel({
                            ...editingChannel,
                            triggerRules: { ...editingChannel.triggerRules, notifyOnAgentReport: e.target.checked },
                          })
                        }
                        className="rounded border-white/20 bg-white/5 text-[#D4AF37] focus:ring-0"
                      />
                      <span>Trigger when Autonomous AI Agent Reports are run</span>
                    </label>
                  </div>
                </div>

                {/* Keyword tags */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-white/60">Match Specific Keywords / Tags</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newKeywordInput.trim()) {
                            const updated = [
                              ...(editingChannel.triggerRules.customKeywords || []),
                              newKeywordInput.trim(),
                            ];
                            setEditingChannel({
                              ...editingChannel,
                              triggerRules: { ...editingChannel.triggerRules, customKeywords: updated },
                            });
                            setNewKeywordInput('');
                          }
                        }
                      }}
                      placeholder="e.g. Career, Milestones, Action Items (press Enter)"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-white/15 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newKeywordInput.trim()) {
                          const updated = [
                            ...(editingChannel.triggerRules.customKeywords || []),
                            newKeywordInput.trim(),
                          ];
                          setEditingChannel({
                            ...editingChannel,
                            triggerRules: { ...editingChannel.triggerRules, customKeywords: updated },
                          });
                          setNewKeywordInput('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {editingChannel.triggerRules.customKeywords?.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px] flex items-center gap-1"
                      >
                        #{kw}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingChannel.triggerRules.customKeywords.filter((_, i) => i !== idx);
                            setEditingChannel({
                              ...editingChannel,
                              triggerRules: { ...editingChannel.triggerRules, customKeywords: updated },
                            });
                          }}
                          className="hover:text-red-400"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toSave = {
                      ...editingChannel,
                      recipientEmail: editingChannel.type === 'email' ? recipientEmailInput : undefined,
                    };
                    handleSaveChannel(toSave, webhookInput ? webhookInput : undefined);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#EED484] text-black font-medium text-xs uppercase tracking-wider"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
