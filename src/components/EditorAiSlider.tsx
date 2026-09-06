import React, { useRef, useState } from 'react';
import {
  Database,
  Bot,
  Cpu,
  Sparkles,
  Image as ImageIcon,
  Brain,
  ListTodo,
  Scale,
  MapPin,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AgentRoleType, EntryLocation } from '../types';

interface EditorAiSliderProps {
  activeEntryTitle?: string;
  hasContent?: boolean;
  totalVaultEntries?: number;
  activeMcpCount?: number;
  imageCount?: number;
  isSummarizing?: boolean;
  location?: EntryLocation;
  onOpenRag: () => void;
  onOpenAgents?: (agentType?: AgentRoleType) => void;
  onOpenMcpHub?: (toolId?: string) => void;
  onQuickSummarize?: () => void;
  onTriggerAddImage?: () => void;
  onOpenLocationPicker?: () => void;
}

export const EditorAiSlider: React.FC<EditorAiSliderProps> = ({
  activeEntryTitle,
  hasContent = false,
  totalVaultEntries = 0,
  activeMcpCount = 0,
  imageCount = 0,
  isSummarizing = false,
  location,
  onOpenRag,
  onOpenAgents,
  onOpenMcpHub,
  onQuickSummarize,
  onTriggerAddImage,
  onOpenLocationPicker,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  const checkScrollBounds = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 320;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScrollBounds, 350);
  };

  return (
    <div className="border-b border-white/10 bg-[#0C0C0C] text-[#E5E5E5] shrink-0 font-sans select-none transition-all">
      {/* Slider Header Control Bar */}
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between border-b border-white/5 bg-[#0E0E0E]/80">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-[11px] font-sans font-semibold tracking-wider uppercase text-white/70 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#D4AF37]" />
            <span>AI Intelligence Slider</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] text-white/30 font-mono">
            • RAG Memory • AI Agents • MCP Bridge • Maps Geolocation
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Scroll Navigation Arrows */}
          {!isCollapsed && (
            <div className="flex items-center gap-1 mr-1">
              <button
                id="ai-slider-prev-btn"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:hover:bg-white/5 transition-colors cursor-pointer"
                title="Scroll slider left"
                aria-label="Previous tools"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                id="ai-slider-next-btn"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:hover:bg-white/5 transition-colors cursor-pointer"
                title="Scroll slider right"
                aria-label="Next tools"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Toggle Minimize/Collapse Slider */}
          <button
            id="toggle-ai-slider-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-white/40 hover:text-white/80 hover:bg-white/5 flex items-center gap-1 transition-colors cursor-pointer font-mono"
            title={isCollapsed ? 'Expand AI Suite Slider' : 'Collapse AI Suite Slider'}
          >
            <span>{isCollapsed ? 'Expand Slider' : 'Hide'}</span>
            {isCollapsed ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Horizontal Slider Track */}
      {!isCollapsed && (
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollBounds}
          className="p-3 overflow-x-auto flex items-stretch gap-2.5 scroll-smooth custom-scrollbar"
        >
          {/* CARD 1: RAG Memory Vault Search */}
          <div className="min-w-[260px] max-w-[280px] p-3 rounded-xl bg-gradient-to-b from-[#16140D] to-[#0F0F0F] border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between group shadow-sm shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    RAG Vault Memory
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-mono uppercase tracking-wider font-semibold">
                  Grounded
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                Ask questions across all past vault reflections with grounded citation memory.
              </p>
            </div>

            <button
              id="slider-open-rag-btn"
              onClick={onOpenRag}
              className="w-full py-1.5 px-3 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-medium tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Database className="w-3 h-3" />
              <span>Query Memory Vault</span>
            </button>
          </div>

          {/* CARD 2: Autonomous AI Growth Coach */}
          <div className="min-w-[260px] max-w-[280px] p-3 rounded-xl bg-gradient-to-b from-[#18141F] to-[#0F0F0F] border border-purple-500/20 hover:border-purple-500/50 transition-all flex flex-col justify-between group shadow-sm shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Growth Trajectory
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono uppercase tracking-wider font-semibold">
                  Agent
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                Track personal evolution, breakthrough momentum, and growth trajectories.
              </p>
            </div>

            <button
              id="slider-open-growth-agent-btn"
              onClick={() => onOpenAgents?.('growth_coach')}
              className="w-full py-1.5 px-3 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-medium tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bot className="w-3 h-3" />
              <span>Deploy Growth Coach</span>
            </button>
          </div>

          {/* CARD 3: Cognitive Distortion Auditor (CBT) */}
          <div className="min-w-[260px] max-w-[280px] p-3 rounded-xl bg-gradient-to-b from-[#1F1418] to-[#0F0F0F] border border-rose-500/20 hover:border-rose-500/50 transition-all flex flex-col justify-between group shadow-sm shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                    <Brain className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    CBT Bias Auditor
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono uppercase tracking-wider font-semibold">
                  Agent
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                Scans journal text for catastrophizing, impostor syndrome, and generates reframes.
              </p>
            </div>

            <button
              id="slider-open-distortion-agent-btn"
              onClick={() => onOpenAgents?.('bias_auditor')}
              className="w-full py-1.5 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-medium tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Brain className="w-3 h-3" />
              <span>Audit Biases & Reframes</span>
            </button>
          </div>

          {/* CARD 4: Action Plan & Milestone Decomposer */}
          <div className="min-w-[260px] max-w-[280px] p-3 rounded-xl bg-gradient-to-b from-[#121A15] to-[#0F0F0F] border border-emerald-500/20 hover:border-emerald-500/50 transition-all flex flex-col justify-between group shadow-sm shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ListTodo className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Action Plan Decomposer
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono uppercase tracking-wider font-semibold">
                  Agent
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                Translates abstract reflections into high-leverage milestones and task checklists.
              </p>
            </div>

            <button
              id="slider-open-action-plan-agent-btn"
              onClick={() => onOpenAgents?.('action_planner')}
              className="w-full py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ListTodo className="w-3 h-3" />
              <span>Decompose Milestones</span>
            </button>
          </div>

          {/* CARD 5: Decision Matrix & Tradeoffs */}
          <div className="min-w-[260px] max-w-[280px] p-3 rounded-xl bg-gradient-to-b from-[#131722] to-[#0F0F0F] border border-blue-500/20 hover:border-blue-500/50 transition-all flex flex-col justify-between group shadow-sm shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Scale className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Decision Matrix
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono uppercase tracking-wider font-semibold">
                  Agent
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                Evaluates Type 1 vs Type 2 decisions, risk landscape, and 2nd-order impacts.
              </p>
            </div>

            <button
              id="slider-open-decision-agent-btn"
              onClick={() => onOpenAgents?.('decision_evaluator')}
              className="w-full py-1.5 px-3 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[11px] font-medium tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Scale className="w-3 h-3" />
              <span>Evaluate Tradeoffs</span>
            </button>
          </div>

          {/* CARD 6: Model Context Protocol (MCP) Tool Bridge */}
          <div className="min-w-[260px] max-w-[280px] p-3 rounded-xl bg-gradient-to-b from-[#121B1D] to-[#0F0F0F] border border-cyan-500/20 hover:border-cyan-500/50 transition-all flex flex-col justify-between group shadow-sm shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    MCP Tool Hub
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono uppercase tracking-wider font-semibold">
                  Telemetry
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                Bridge Google Calendar, Notion notes, GitHub activity, and biometric sleep data.
              </p>
            </div>

            <button
              id="slider-open-mcp-hub-btn"
              onClick={() => onOpenMcpHub?.()}
              className="w-full py-1.5 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Cpu className="w-3 h-3" />
              <span>Launch MCP Bridge</span>
            </button>
          </div>

          {/* CARD 7: AI Auto-Summarize & Insights */}
          <div className="min-w-[260px] max-w-[280px] p-3 rounded-xl bg-gradient-to-b from-[#1D1812] to-[#0F0F0F] border border-amber-500/20 hover:border-amber-500/50 transition-all flex flex-col justify-between group shadow-sm shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Synthesis & Mood
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono uppercase tracking-wider font-semibold">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                Synthesize key takeaways, emotional mood state, and recurring tags.
              </p>
            </div>

            <button
              id="slider-trigger-summarize-btn"
              onClick={onQuickSummarize}
              disabled={isSummarizing || (!hasContent && imageCount === 0)}
              className="w-full py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-medium tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isSummarizing ? 'Synthesizing...' : 'Run Auto-Synthesis'}</span>
            </button>
          </div>

          {/* CARD 8: Visual Attachments & Vision OCR */}
          <div className="min-w-[260px] max-w-[280px] p-3 rounded-xl bg-gradient-to-b from-[#141520] to-[#0F0F0F] border border-indigo-500/20 hover:border-indigo-500/50 transition-all flex flex-col justify-between group shadow-sm shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Visual Evidence ({imageCount})
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono uppercase tracking-wider font-semibold">
                  Vision
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                Attach photos, diagrams, whiteboard captures, and notes with AI Vision.
              </p>
            </div>

            <button
              id="slider-add-image-btn"
              onClick={onTriggerAddImage}
              className="w-full py-1.5 px-3 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Attach New Photo</span>
            </button>
          </div>

          {/* CARD 9: Sanctuary Geolocation (Google Maps Platform) */}
          <div
            id="slider-location-card"
            className={`min-w-[260px] max-w-[280px] p-3 rounded-xl bg-gradient-to-b ${
              location ? 'from-[#1A1810] to-[#0F0F0F] border-[#D4AF37]/40' : 'from-[#141B18] to-[#0F0F0F] border-teal-500/20 hover:border-teal-500/50'
            } border transition-all flex flex-col justify-between group shadow-sm shrink-0`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${location ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-teal-500/10 text-teal-400'}`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide truncate max-w-[140px]">
                    {location ? location.placeName : 'Sanctuary Map'}
                  </span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-semibold ${
                  location ? 'bg-[#D4AF37]/20 text-[#EED484]' : 'bg-teal-500/20 text-teal-300'
                }`}>
                  {location ? 'Pinned' : 'Maps'}
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                {location ? (
                  <span className="block text-white/70 font-mono text-[10px] truncate">
                    📍 {location.formattedAddress || `${location.lat.toFixed(3)}°, ${location.lng.toFixed(3)}°`}
                  </span>
                ) : (
                  'Pin mindfulness sanctuaries & locations using Google Maps Platform.'
                )}
              </p>
            </div>

            <button
              id="slider-open-location-btn"
              type="button"
              onClick={onOpenLocationPicker}
              className={`w-full py-1.5 px-3 rounded-lg border text-[11px] font-medium tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                location
                  ? 'bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border-[#D4AF37]/30 text-[#D4AF37]'
                  : 'bg-teal-500/15 hover:bg-teal-500/25 border-teal-500/30 text-teal-300'
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>{location ? 'Change Coordinates' : 'Pin Sanctuary Location'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
