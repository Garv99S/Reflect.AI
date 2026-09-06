import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Calendar,
  FileCode2,
  GitBranch,
  Activity,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  RefreshCw,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import type { McpTool } from '../types';
import { fetchMcpTools, executeMcpTool } from '../lib/geminiApi';

interface McpHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEntryTitle?: string;
  activeEntryContent?: string;
  initialToolId?: string;
  onInjectContext?: (toolName: string, contextData: Record<string, unknown>) => void;
}

export const McpHubModal: React.FC<McpHubModalProps> = ({
  isOpen,
  onClose,
  activeEntryTitle,
  activeEntryContent,
  initialToolId,
  onInjectContext,
}) => {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>(initialToolId || 'calendar_schedule');
  const [toolParams, setToolParams] = useState<Record<string, unknown>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [injected, setInjected] = useState(false);

  useEffect(() => {
    if (initialToolId && isOpen) {
      setSelectedToolId(initialToolId);
    }
  }, [initialToolId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchMcpTools()
        .then((res) => {
          setTools(res.tools || []);
          if (res.tools && res.tools.length > 0 && !selectedToolId) {
            setSelectedToolId(initialToolId || res.tools[0].id);
          }
        })
        .catch((err) => console.error('Failed to load MCP tools:', err));
    }
  }, [isOpen, initialToolId]);

  if (!isOpen) return null;

  const activeTool = tools.find((t) => t.id === selectedToolId) || tools[0];

  const handleExecute = async () => {
    if (!activeTool) return;
    try {
      setIsExecuting(true);
      setError(null);
      setExecutionResult(null);

      const res = await executeMcpTool({
        toolId: activeTool.id,
        params: toolParams,
        activeEntryTitle,
        activeEntryContent,
      });

      if (res.status === 'success' && res.data) {
        setExecutionResult(res.data);
      } else {
        setError(res.error || 'MCP execution returned an error');
      }
    } catch (err: unknown) {
      console.error('MCP execution error:', err);
      setError((err as Error)?.message || 'Failed to execute MCP tool');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyJson = () => {
    if (!executionResult) return;
    navigator.clipboard.writeText(JSON.stringify(executionResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInject = () => {
    if (!executionResult || !onInjectContext || !activeTool) return;
    onInjectContext(activeTool.name, executionResult);
    setInjected(true);
    setTimeout(() => setInjected(false), 2000);
  };

  const getToolIcon = (category: string) => {
    switch (category) {
      case 'calendar':
        return Calendar;
      case 'knowledge':
        return FileCode2;
      case 'developer':
        return GitBranch;
      case 'wellness':
        return Activity;
      default:
        return Cpu;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        id="mcp-hub-modal"
        className="w-full max-w-4xl max-h-[90vh] bg-[#0E0E0E] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#E5E5E5]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#8E793E] p-0.5 flex items-center justify-center text-black shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Cpu className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-light tracking-wide text-white">
                  Model Context Protocol (MCP) Hub
                </h2>
                <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                  Tool Bridge
                </span>
              </div>
              <p className="text-xs text-white/50 font-sans">
                Connect external systems (Calendar, Notion, GitHub, Biometrics) directly into ReflectAI
              </p>
            </div>
          </div>
          <button
            id="close-mcp-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Tool Selector Grid */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-3">
              Connected MCP Server Tools
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tools.map((tool) => {
                const IconComp = getToolIcon(tool.category);
                const isSelected = selectedToolId === tool.id;
                return (
                  <button
                    key={tool.id}
                    id={`select-mcp-tool-${tool.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedToolId(tool.id);
                      setExecutionResult(null);
                      setError(null);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.08)]'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <IconComp className={`w-4 h-4 ${isSelected ? 'text-[#D4AF37]' : 'text-white/60'}`} />
                          <span className="text-sm font-medium text-white tracking-wide">{tool.name}</span>
                        </div>
                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed line-clamp-2">{tool.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Tool Parameters & Execution */}
          {activeTool && (
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-white/80">
                    Tool Execution Inspector: {activeTool.name}
                  </span>
                </div>
                <span className="text-[11px] text-white/40 font-mono">Provider: {activeTool.provider}</span>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-white/40">
                  Target context: <span className="text-white/70">{activeEntryTitle || 'General Vault'}</span>
                </div>
                <button
                  id="execute-mcp-tool-btn"
                  type="button"
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#8E793E] hover:from-[#EED484] hover:to-[#A38A4A] text-black font-sans font-medium text-xs tracking-wider uppercase transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isExecuting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Executing Protocol...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute Tool Protocol</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result Inspector */}
          {executionResult && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#080808] border border-white/10 space-y-4 shadow-xl animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-medium text-white tracking-wide">
                    MCP Protocol Output Received
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="copy-mcp-json-btn"
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>

                  {onInjectContext && (
                    <button
                      id="inject-mcp-context-btn"
                      onClick={handleInject}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 text-xs text-[#EED484] transition-colors cursor-pointer"
                    >
                      {injected ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>{injected ? 'Attached to Reflection' : 'Inject Context'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Pretty JSON Viewer */}
              <pre className="p-4 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-72 leading-relaxed">
                {JSON.stringify(executionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
