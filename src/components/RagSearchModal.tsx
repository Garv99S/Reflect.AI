import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Search,
  BookOpen,
  Database,
  Calendar,
  Layers,
  ArrowRight,
  Copy,
  Check,
  X,
  ExternalLink,
  Tag,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { JournalEntry, RagSourceMatch } from '../types';
import { queryRagMemory } from '../lib/geminiApi';
import { VoiceInputButton } from './VoiceInputButton';

interface RagSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onSelectEntry?: (entryId: string) => void;
  onInsertIntoReflection?: (text: string) => void;
}

const SAMPLE_RAG_QUERIES = [
  'When did I feel most overwhelmed recently and what helped me get unstuck?',
  'What recurring patterns or themes appear in my breakthrough insights?',
  'How has my approach to work-life balance evolved over time?',
  'Summarize the core decisions I have reflected on so far.',
];

export const RagSearchModal: React.FC<RagSearchModalProps> = ({
  isOpen,
  onClose,
  entries,
  onSelectEntry,
  onInsertIntoReflection,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<RagSourceMatch[]>([]);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (queryToRun?: string) => {
    const q = (queryToRun !== undefined ? queryToRun : query).trim();
    if (!q) return;

    try {
      setIsSearching(true);
      setError(null);
      setAnswer(null);
      setSources([]);

      const formattedEntries = entries.map((e) => ({
        id: e.id,
        title: e.title,
        content: e.content,
        createdAt: e.createdAt,
        mood: e.mood,
        keyThemes: e.keyThemes,
        insights: e.insights,
        summary: e.summary,
        images: e.images?.map((img) => ({ name: img.name, notes: img.notes })),
      }));

      const res = await queryRagMemory({
        query: q,
        entries: formattedEntries,
      });

      setAnswer(res.answer);
      setSources(res.sources || []);
      setModelUsed(res.modelUsed);
    } catch (err: unknown) {
      console.error('RAG query error:', err);
      setError((err as Error)?.message || 'Failed to complete RAG retrieval');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        id="rag-memory-modal"
        className="w-full max-w-3xl max-h-[90vh] bg-[#0E0E0E] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#E5E5E5]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#8E793E] p-0.5 flex items-center justify-center text-black shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Database className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-light tracking-wide text-white">
                  RAG Vault Memory Search
                </h2>
                <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                  Semantic Retrieval
                </span>
              </div>
              <p className="text-xs text-white/50 font-sans">
                Search and synthesize cross-temporal patterns across your entire private journal vault
              </p>
            </div>
          </div>
          <button
            id="close-rag-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Query Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="rag-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask any question about your past reflections or patterns..."
                className="w-full pl-10 pr-12 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]/60 transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <VoiceInputButton
                  id="voice-rag-query-btn"
                  onTranscript={(text) => setQuery((prev) => (prev ? `${prev} ${text}`.trim() : text.trim()))}
                  currentValue={query}
                  size="sm"
                  tooltip="Dictate your question"
                />
              </div>
            </div>
            <button
              id="rag-submit-btn"
              type="submit"
              disabled={isSearching || !query.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#8E793E] hover:from-[#EED484] hover:to-[#A38A4A] text-black font-sans font-medium text-xs tracking-wider uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center gap-2"
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isSearching ? 'Searching...' : 'Ask Vault'}</span>
            </button>
          </form>

          {/* Sample Prompts */}
          {!answer && !isSearching && (
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-white/40 mb-2.5">
                Suggested Cross-Vault Questions:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_RAG_QUERIES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(sample);
                      handleSearch(sample);
                    }}
                    className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#D4AF37]/30 text-left text-xs text-white/70 hover:text-white transition-all cursor-pointer flex items-start gap-2"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 shrink-0" />
                    <span>{sample}</span>
                  </button>
                ))}
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

          {/* Loading Indicator */}
          {isSearching && (
            <div className="p-8 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-3 animate-in fade-in">
              <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-white/60">
                Vectorizing query & scoring cosine similarity across {entries.length} vault reflections...
              </p>
            </div>
          )}

          {/* Synthesis Answer */}
          {answer && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-5 sm:p-6 rounded-2xl bg-[#080808] border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-medium text-white tracking-wide">
                      Grounded Vault Synthesis
                    </h3>
                    {modelUsed && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40">
                        {modelUsed}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="copy-rag-answer-btn"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    {onInsertIntoReflection && (
                      <button
                        id="insert-rag-answer-btn"
                        onClick={() => {
                          onInsertIntoReflection(`\n\n### 🔍 Vault Memory Synthesis ("${query}")\n${answer}\n`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 text-xs text-[#EED484] transition-colors cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Insert into Entry</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed font-sans space-y-3">
                  <ReactMarkdown>{answer}</ReactMarkdown>
                </div>
              </div>

              {/* Retrieved Citation Sources */}
              {sources.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="text-xs font-mono uppercase tracking-widest text-white/60">
                      Retrieved Vault Sources ({sources.length} matches):
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sources.map((src) => (
                      <div
                        key={src.id}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h5 className="text-xs font-medium text-white truncate">{src.title}</h5>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] shrink-0">
                              {Math.round(src.similarity * 100)}% match
                            </span>
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-3">
                            "{src.excerpt}"
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[10px] text-white/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {src.date}
                          </span>

                          {onSelectEntry && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectEntry(src.id);
                                onClose();
                              }}
                              className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Open Entry</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
