import type { ReflectionMode, InteractionMessage, SummaryResponse, ReflectionResponse } from '../types';

export async function askGeminiReflection(params: {
  prompt?: string;
  history?: InteractionMessage[];
  mode?: ReflectionMode;
  entryTitle?: string;
}): Promise<ReflectionResponse> {
  const formattedHistory = (params.history || []).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: params.prompt || '',
      history: formattedHistory,
      mode: params.mode || 'reflect',
      entryTitle: params.entryTitle || '',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

export async function summarizeJournalEntry(params: {
  title: string;
  content: string;
}): Promise<SummaryResponse> {
  const response = await fetch('/api/gemini/summarize-entry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

// ==========================================
// RAG (RETRIEVAL-AUGMENTED GENERATION) API
// ==========================================

export async function queryRagMemory(params: {
  query: string;
  entries: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    mood?: string;
    keyThemes?: string[];
    insights?: string[];
    summary?: string;
    images?: Array<{ name?: string; notes?: string }>;
  }>;
}): Promise<{
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    date: string;
    excerpt: string;
    similarity: number;
    keyThemes?: string[];
    mood?: string;
  }>;
  modelUsed: string;
  timestamp: string;
}> {
  const response = await fetch('/api/rag/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: params.query,
      entries: params.entries,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

// ==========================================
// AUTONOMOUS AI AGENTS SUITE API
// ==========================================

export async function runAiAgent(params: {
  agentType: 'growth_coach' | 'bias_auditor' | 'action_planner' | 'decision_evaluator';
  targetMode: 'single' | 'all';
  activeEntry?: unknown;
  allEntries?: unknown[];
  customGoal?: string;
  mcpContext?: Record<string, unknown>;
}): Promise<{
  report: string;
  agentType: string;
  agentName: string;
  thoughtProcess: string[];
  entriesAnalyzedCount: number;
  modelUsed: string;
  timestamp: string;
}> {
  const response = await fetch('/api/agent/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

// ==========================================
// MODEL CONTEXT PROTOCOL (MCP) API
// ==========================================

export async function fetchMcpTools(): Promise<{
  protocolVersion: string;
  tools: Array<{
    id: string;
    name: string;
    category: 'calendar' | 'knowledge' | 'developer' | 'wellness';
    description: string;
    provider: string;
    parameters: Record<string, { type: string; description: string; default?: unknown }>;
  }>;
  serverStatus: string;
}> {
  const response = await fetch('/api/mcp/tools');
  if (!response.ok) {
    throw new Error('Failed to fetch MCP tools registry');
  }
  return response.json();
}

export async function executeMcpTool(params: {
  toolId: string;
  params?: Record<string, unknown>;
  activeEntryTitle?: string;
  activeEntryContent?: string;
}): Promise<{
  tool: string;
  status: 'success' | 'error';
  data?: Record<string, unknown>;
  error?: string;
}> {
  const response = await fetch('/api/mcp/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'MCP execution error' }));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

