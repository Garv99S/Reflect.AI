import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Bot,
  Brain,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  Play,
  RotateCcw,
  Compass,
  Layers,
  Scale,
  ListTodo,
  TrendingUp,
  Cpu,
  ArrowRight,
  Database,
  Calendar,
} from 'lucide-react';
import type { JournalEntry, AgentRoleType } from '../types';
import { runAiAgent } from '../lib/geminiApi';
import { VoiceInputButton } from './VoiceInputButton';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEntry: JournalEntry | null;
  allEntries: JournalEntry[];
  mcpContext?: Record<string, unknown> | null;
  initialAgentType?: AgentRoleType;
  onInsertIntoReflection?: (text: string) => void;
}

interface AgentCardInfo {
  type: AgentRoleType;
  name: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const AGENTS: AgentCardInfo[] = [
  {
    type: 'growth_coach',
    name: 'Growth & Trajectory Coach',
    badge: 'Synthesis & Momentum',
    icon: TrendingUp,
    description: 'Synthesizes long-term emotional trajectories, recurring cycles, and strategic growth practices.',
    color: 'from-amber-500/20 to-yellow-600/20 border-amber-500/30 text-amber-300',
  },
  {
    type: 'bias_auditor',
    name: 'Cognitive Distortion Auditor',
    badge: 'CBT & Mental Clarity',
    icon: Brain,
    description: 'Detects subconscious cognitive distortions (catastrophizing, all-or-nothing, mind reading) with Socratic reframes.',
    color: 'from-purple-500/20 to-indigo-600/20 border-purple-500/30 text-purple-300',
  },
  {
    type: 'action_planner',
    name: 'Action Plan Decomposer',
    badge: 'Execution & Roadmap',
    icon: ListTodo,
    description: 'Extracts implicit commitments and builds a prioritized milestone roadmap with anti-procrastination safeguards.',
    color: 'from-emerald-500/20 to-teal-600/20 border-emerald-500/30 text-emerald-300',
  },
  {
    type: 'decision_evaluator',
    name: 'Decision Matrix & Tradeoff Agent',
    badge: 'Risk & 2nd-Order Thinking',
    icon: Scale,
    description: 'Stress-tests dilemmas, maps 2nd-order consequences, and classifies reversible vs irreversible choices.',
    color: 'from-blue-500/20 to-cyan-600/20 border-blue-500/30 text-blue-300',
  },
];

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  activeEntry,
  allEntries,
  mcpContext,
  initialAgentType,
  onInsertIntoReflection,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentRoleType>(initialAgentType || 'growth_coach');

  useEffect(() => {
    if (initialAgentType && isOpen) {
      setSelectedAgent(initialAgentType);
    }
  }, [initialAgentType, isOpen]);
  const [targetScope, setTargetScope] = useState<'single' | 'all'>('all');
  const [customGoal, setCustomGoal] = useState('');
  const [useMcpContext, setUseMcpContext] = useState<boolean>(Boolean(mcpContext));
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [report, setReport] = useState<string | null>(null);
  const [thoughtProcess, setThoughtProcess] = useState<string[]>([]);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);

  if (!isOpen) return null;

  const handleRunAgent = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setReport(null);
      setThoughtProcess([]);
      setCurrentStepIndex(0);

      // Simulate initial reasoning step progression for smooth UX
      const stepTimer = setInterval(() => {
        setCurrentStepIndex((prev) => Math.min(prev + 1, 3));
      }, 900);

      const res = await runAiAgent({
        agentType: selectedAgent,
        targetMode: targetScope,
        activeEntry: activeEntry || undefined,
        allEntries: allEntries || [],
        customGoal: customGoal.trim() || undefined,
        mcpContext: useMcpContext && mcpContext ? mcpContext : undefined,
      });

      clearInterval(stepTimer);
      setReport(res.report);
      setThoughtProcess(res.thoughtProcess || []);
      setModelUsed(res.modelUsed);
    } catch (err: unknown) {
      console.error('Agent execution error:', err);
      setError((err as Error)?.message || 'Failed to complete agent execution');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!report || !onInsertIntoReflection) return;
    onInsertIntoReflection(`\n\n### 🤖 AI Agent Synthesis (${AGENTS.find((a) => a.type === selectedAgent)?.name})\n${report}\n`);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  const currentAgentInfo = AGENTS.find((a) => a.type === selectedAgent) || AGENTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        id="agent-console-modal"
        className="w-full max-w-4xl max-h-[90vh] bg-[#0E0E0E] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#E5E5E5]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#8E793E] p-0.5 flex items-center justify-center text-black shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-light tracking-wide text-white">
                  Autonomous AI Agents Suite
                </h2>
                <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                  Multi-Agent
                </span>
              </div>
              <p className="text-xs text-white/50 font-sans">
                Deep analytical reflection coaches with multi-step reasoning protocols
              </p>
            </div>
          </div>
          <button
            id="close-agent-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Agent Selection Grid */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-3">
              1. Select Specialized Agent Archetype
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AGENTS.map((agent) => {
                const IconComponent = agent.icon;
                const isSelected = selectedAgent === agent.type;
                return (
                  <button
                    key={agent.type}
                    id={`select-agent-${agent.type}`}
                    type="button"
                    onClick={() => {
                      setSelectedAgent(agent.type);
                      setReport(null);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `bg-gradient-to-br ${agent.color} border-current shadow-[0_0_20px_rgba(212,175,55,0.1)]`
                        : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-4 h-4 ${isSelected ? 'text-current' : 'text-white/60'}`} />
                          <span className="text-sm font-medium text-white tracking-wide">{agent.name}</span>
                        </div>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-white/60">
                          {agent.badge}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{agent.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/50 mb-2">
                2. Dataset Analysis Scope
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="agent-scope-all-btn"
                  onClick={() => setTargetScope('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-sans tracking-wide border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    targetScope === 'all'
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#EED484]'
                      : 'bg-black/30 border-white/5 text-white/50 hover:bg-white/5'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Vault ({allEntries.length} Entries)</span>
                </button>
                <button
                  type="button"
                  id="agent-scope-single-btn"
                  onClick={() => setTargetScope('single')}
                  disabled={!activeEntry}
                  className={`px-3 py-2 rounded-lg text-xs font-sans tracking-wide border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    targetScope === 'single'
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#EED484]'
                      : 'bg-black/30 border-white/5 text-white/50 hover:bg-white/5'
                  } ${!activeEntry ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Active Entry Only</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/50 mb-2">
                3. Custom Focus Goal (Optional)
              </label>
              <div className="relative flex items-center">
                <input
                  id="agent-custom-goal-input"
                  type="text"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder="e.g. Focus on career confidence or work-life balance..."
                  className="w-full pl-3 pr-10 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <VoiceInputButton
                    id="voice-agent-goal-btn"
                    onTranscript={(text) => setCustomGoal((prev) => (prev ? `${prev} ${text}`.trim() : text.trim()))}
                    currentValue={customGoal}
                    size="xs"
                    tooltip="Dictate custom focus goal"
                  />
                </div>
              </div>
            </div>

            {mcpContext && (
              <div className="sm:col-span-2 pt-2 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs text-white/70">Connected MCP Context available (Calendar / Biometrics)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#D4AF37]">
                  <input
                    type="checkbox"
                    checked={useMcpContext}
                    onChange={(e) => setUseMcpContext(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>Inject MCP Telemetry</span>
                </label>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/40">
              Selected: <span className="text-white/80 font-medium">{currentAgentInfo.name}</span>
            </div>
            <button
              id="run-agent-btn"
              type="button"
              onClick={handleRunAgent}
              disabled={isRunning || (targetScope === 'single' && !activeEntry) || (targetScope === 'all' && allEntries.length === 0)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#8E793E] hover:from-[#EED484] hover:to-[#A38A4A] text-black font-sans font-medium text-xs tracking-wider uppercase shadow-lg shadow-[#D4AF37]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Agent Thinking...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Deploy {currentAgentInfo.name.split(' ')[0]} Agent</span>
                </>
              )}
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Execution Pipeline */}
          {isRunning && (
            <div className="p-5 rounded-xl bg-black/60 border border-[#D4AF37]/30 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37]">
                <Cpu className="w-4 h-4 animate-pulse" />
                <span>ACTIVE REASONING PIPELINE:</span>
              </div>
              <div className="space-y-2">
                {[
                  'Ingesting private journal vault records & metadata...',
                  'Mapping emotional vectors, recurring themes, and linguistic markers...',
                  'Executing specialized multi-variable reasoning matrix...',
                  'Synthesizing holistic coach feedback and structured actionable roadmap...',
                ].map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 text-xs transition-opacity ${
                      idx <= currentStepIndex ? 'text-white/90 opacity-100' : 'text-white/30 opacity-40'
                    }`}
                  >
                    {idx < currentStepIndex ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : idx === currentStepIndex ? (
                      <div className="w-3.5 h-3.5 border border-[#D4AF37] border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />
                    )}
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output Report */}
          {report && !isRunning && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#080808] border border-white/10 space-y-4 shadow-xl animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="text-sm font-medium text-white tracking-wide">
                    Agent Report: {currentAgentInfo.name}
                  </h3>
                  {modelUsed && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40">
                      {modelUsed}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="copy-agent-report-btn"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  {onInsertIntoReflection && (
                    <button
                      id="insert-agent-report-btn"
                      onClick={handleInsert}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 text-xs text-[#EED484] transition-colors cursor-pointer"
                    >
                      {inserted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>{inserted ? 'Inserted' : 'Insert into Entry'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed font-sans space-y-3">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
