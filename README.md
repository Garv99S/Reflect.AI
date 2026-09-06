# ReflectAI - Sovereign AI Journal, Cognitive Sanctuary & Autonomous Reflection Platform

A private, enterprise-grade personal reflection and cognitive journaling system powered by **Gemini 3.6 Flash / 3.7 Flash**, **Retrieval-Augmented Generation (RAG)**, **Model Context Protocol (MCP)**, **Autonomous AI Agents**, **Google Maps Platform**, **Multi-Channel Webhook Notifications (Discord/Slack/Email)**, and **Role-Based Access Control (RBAC)**.

Built on **React 19**, **Express**, **Firebase Authentication**, and **Google Cloud Firestore**, ReflectAI enforces zero-trust tenant isolation: every prompt, journal record, coordinate, and AI synthesis is strictly owner-bound (`request.auth.uid == userId`) so that users can never access or compromise another tenant's data.

---

## 📑 Table of Contents
1. [Core Architectural Highlights](#-core-architectural-highlights)
2. [Deep Dive: AI, RAG, MCP & Autonomous Agents](#-deep-dive-ai-rag-mcp--autonomous-agents)
   - [1. Gemini Multi-Model Cognitive AI Engine](#1-gemini-multi-model-cognitive-ai-engine)
   - [2. Semantic RAG (Retrieval-Augmented Generation) Vault](#2-semantic-rag-retrieval-augmented-generation-vault)
   - [3. Model Context Protocol (MCP) Integration](#3-model-context-protocol-mcp-integration)
   - [4. Autonomous AI Reflection Agents](#4-autonomous-ai-reflection-agents)
3. [Platform Feature Matrix](#-platform-feature-matrix)
   - [Location Intelligence & Google Maps Proxy](#location-intelligence--google-maps-proxy)
   - [Multi-Channel Notification Dispatcher](#multi-channel-notification-dispatcher)
   - [Role-Based Access Control (RBAC) Admin Console](#role-based-access-control-rbac-admin-console)
   - [Voice Dictation & Multimodal Reflection](#voice-dictation--multimodal-reflection)
4. [🔒 Threat Modeling & Security Architecture](#-threat-modeling--security-architecture)
5. [🚀 Google Cloud Run Deployment & Configuration Guide](#-google-cloud-run-deployment--configuration-guide)
   - [Step 1: Prerequisites & GCP API Enablement](#step-1-prerequisites--gcp-api-enablement)
   - [Step 2: Google Cloud Secret Manager Setup](#step-2-google-cloud-secret-manager-setup)
   - [Step 3: Firestore Security Rules Deployment](#step-3-firestore-security-rules-deployment)
   - [Step 4: Cloud Run Deployment](#step-4-cloud-run-deployment)
   - [Step 5: Mandatory Campaign Verification Labeling](#step-5-mandatory-campaign-verification-labeling)
6. [🧪 Comprehensive Verification & Walkthrough Test Cases](#-comprehensive-verification--walkthrough-test-cases)
7. [📡 Server API Endpoint Catalog](#-server-api-endpoint-catalog)
8. [📄 License](#-license)

---

## 🌟 Core Architectural Highlights

- **Multi-Model Fallback Ladder**: Primary `gemini-3.6-flash`, high-availability `gemini-3.1-flash-lite`, dynamic alias `gemini-flash-latest`, and deep reasoning `gemini-3.7-flash` with automatic recovery from 429 quota exhaustion and 503 service interrupts.
- **Tenant-Isolated RAG Engine**: Vector & cosine similarity retrieval across historic entries with keyword boosting, snippet extraction, and grounded multi-entry synthesis.
- **MCP Tool Hub (Protocol `2024-11-05`)**: Standardized context protocol integrating Google Calendar schedules, Obsidian/Notion markdown graph schemas, GitHub developer activity, and wellness biometrics.
- **4 Autonomous Specialized AI Agents**: Growth Coach, Cognitive Distortion Auditor, Action Plan Milestone Decomposer, and Decision Matrix Evaluator with full thought-process telemetry.
- **Zero-Key-Leakage Server Proxies**: Google Maps Places and Geocoding proxying without exposing API keys to browser clients.
- **Event-Driven Webhook Notifications**: Real-time dispatching to Discord, Slack, and Email using a standardized, privacy-preserving minimal schema with automated emotional trigger filters.
- **Enterprise RBAC & Tamper-Evident Audit Logging**: Cryptographically verified claims (`owner`, `admin`, `user`), stateless middleware, moderation queue, tenant discrepancy scanner, and write-once audit logs.

---

## 🧠 Deep Dive: AI, RAG, MCP & Autonomous Agents

```
                                  ┌────────────────────────┐
                                  │   ReflectAI Frontend   │
                                  │ (React 19 + Tailwind)  │
                                  └───────────┬────────────┘
                                              │ Secure JWT / API Proxy
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Express Backend Services                                 │
│                                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────────────┐  │
│  │   Gemini Fallback     │  │   Semantic RAG Engine │  │     Autonomous Agents       │  │
│  │   Cognitive Pipeline  │  │ (Cosine Similarity +  │  │  - Growth Coach             │  │
│  │ - 3.6 Flash (Primary) │  │  TF-IDF Vector Index) │  │  - Cognitive Bias Auditor   │  │
│  │ - 3.1 Flash-Lite      │  │                       │  │  - Action Milestone Planner │  │
│  │ - 3.7 Flash (Deep)    │  │ Context-Injected Prompts│  - Decision Tradeoff Matrix│  │
│  └──────────┬────────────┘  └───────────┬───────────┘  └──────────────┬──────────────┘  │
│             │                           │                             │                 │
│             └─────────────────────┬─────┴─────────────────────────────┘                 │
│                                   │                                                     │
│                                   ▼                                                     │
│                 ┌───────────────────────────────────┐                                   │
│                 │   Model Context Protocol (MCP)    │                                   │
│                 │  - Google Calendar Schedule       │                                   │
│                 │  - Obsidian / Notion Sync         │                                   │
│                 │  - GitHub Developer Telemetry     │                                   │
│                 │  - Sleep & Wellness Biometrics    │                                   │
│                 └─────────────────┬─────────────────┘                                   │
│                                   │                                                     │
└───────────────────────────────────┼─────────────────────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│ Google Cloud │             │ Cloud Run    │             │ Multi-Channel│
│  Firestore   │             │Secret Manager│             │ Webhooks     │
│(Owner-Bound) │             │(Zero-Hardcode│             │(Discord/Slack│
└──────────────┘             └──────────────┘             └──────────────┘
```

### 1. Gemini Multi-Model Cognitive AI Engine
- **Resilient Fallback Ladder**: The backend wraps all generation calls in an automated cascade:
  1. Primary: `gemini-3.6-flash` (balanced speed & high cognitive coherence)
  2. Fallback: `gemini-3.1-flash-lite` (low latency, high availability)
  3. Dynamic Alias: `gemini-flash-latest` (rolling stable release)
  4. Deep Reasoning: `gemini-3.7-flash` (complex cognitive restructuring & multi-step analysis)
- **Multi-Turn Reflective Persona**: System instructions enforce an empathetic, psychologically grounded (CBT-aligned) reflection partner. It preserves full conversation history while avoiding sycophancy or unsolicited prescriptive advice.
- **Reflection Modes**: Dynamic system prompt modifications for **Reflect** (unpacking thoughts), **Brainstorm** (divergent thinking with higher temperature `0.85`), **Action Items** (extracting actionable next steps), and **Synthesize** (distilling key takeaways).
- **Automated Entry Summarization & Mood Tagging**: `/api/gemini/summarize-entry` analyzes the entry's emotional vector, extracts primary moods (e.g., *Reflective*, *Breakthrough*, *High Stress*), generates key theme pills (`#Mindfulness`, `#Career`), and isolates cognitive takeaways.

### 2. Semantic RAG (Retrieval-Augmented Generation) Vault
- **Zero-External-Vector-Database Architecture**: Implements a zero-latency, server-side in-memory TF-IDF and Cosine Similarity vector index (`/api/rag/query`) operating over the user's private encrypted journal entries.
- **Multi-Field Tokenization & Dynamic Boosting**:
  - Tokenizes titles, body markdown, summaries, emotional tags, and image notes.
  - Applies heuristic weighting: **+0.3** similarity boost for exact title matches, **+0.2** boost for key theme overlap.
- **Best-Sentence Excerpt Extraction**: Locates the highest-scoring sentence in the text body to supply clear, context-rich snippets.
- **Context Injection & Source Grounding**: Top-4 retrieved entries are serialized into a bounded prompt context. Gemini synthesizes a comprehensive response strictly grounded in the user's past writings, citing entries with `[Entry: Title - Date]` citations to prevent hallucinations.

### 3. Model Context Protocol (MCP) Integration
- **Specification Compliance**: Fully conforms to the Model Context Protocol schema (`protocolVersion: 2024-11-05`), exposing available tools via `/api/mcp/tools` and executing calls via `/api/mcp/execute`.
- **Pre-Configured MCP Providers**:
  1. **Google Calendar & Schedule MCP (`calendar_schedule`)**: Queries meeting density, calculates a daily *Meeting Fatigue Index*, detects high context-switching intervals, and recommends optimal 30-minute decompression slots.
  2. **Notion & Obsidian Knowledge MCP (`obsidian_notion_sync`)**: Transforms unstructured journal reflections into permanent zettelkasten-ready Markdown complete with YAML frontmatter, backlinks (`[[Mindset & Resilience]]`), and taxonomy tags.
  3. **GitHub & Developer Activity MCP (`github_dev_telemetry`)**: Gathers commit velocity, PR review counts, and code churn to correlate intense engineering sprints with cognitive fatigue.
  4. **Sleep & Wellness Biometrics MCP (`wellness_biometrics`)**: Incorporates sleep stage breakdowns, HRV recovery metrics, and active hours to help users understand the biological foundations of their mental states.
- **Agent Integration**: MCP tool outputs can be injected directly into the Autonomous Agents as grounding external context.

### 4. Autonomous AI Reflection Agents
Four specialized, multi-step autonomous agents accessible via the **Autonomous AI Agent** hub:
1. **Weekly & Monthly Growth Coach (`growth_coach`)**: Synthesizes emotional and intellectual momentum across up to 10 historical entries, identifying breakthrough peaks, energy drops, and strategic next-week habits.
2. **Cognitive Distortion & Reframing Auditor (`bias_auditor`)**: Scans reflections for cognitive distortions (*Catastrophizing*, *All-or-Nothing Framing*, *Mind Reading*, *Emotional Reasoning*, *Impostor Syndrome*), provides objective reality testing, and formulates 3-step Socratic reframes.
3. **Action Plan & Milestone Decomposition Agent (`action_planner`)**: Decomposes abstract reflections into low-friction 24-hour quick wins, weekly core milestones (with difficulty scores), and anti-procrastination accountability triggers.
4. **Decision Matrix & Tradeoff Evaluator (`decision_evaluator`)**: Stress-tests complex decisions using Type-1 (irreversible) vs. Type-2 (reversible) categorization, 2nd-order consequence evaluation, and low-risk micro-experiments.
- **Transparent Thought Process Telemetry**: Renders live reasoning steps (e.g. *"Mapping emotional vectors..."*, *"Scanning text for cognitive distortions..."*) directly in the UI.

---

## 🛠️ Platform Feature Matrix

### Location Intelligence & Google Maps Proxy
- **Server-Side API Key Proxying**: Eliminates browser exposure of `GOOGLE_MAPS_API_KEY`. The backend `/api/maps/*` routes query Google Maps Platform APIs using server-stored credentials.
- **Geocoding & Reverse Geocoding**: Converts place queries to precise coordinates and converts coordinate pins into human-readable place labels (`formatted_address`, `place_id`).
- **Defensive Data Footprint**: Only minimal attributes (`lat`, `lng`, `name`, `address`) are stored on Firestore entry documents, keeping the data footprint light and strictly isolated.

### Multi-Channel Notification Dispatcher
- **Discord, Slack & Email Integration**: Delivers reflection milestones, AI summaries, and coach reports to external channels.
- **Server-Side Secret Isolation**: Webhook URLs and email credentials are encrypted and stored server-side.
- **Standardized Minimal Schema**: Outbound webhooks transmit structured payloads (`entry_title`, `summary`, `insights`, `mood`, `timestamp`, `channel_name`) without leaking raw private journal notes unless explicitly toggled.
- **Automated & Manual Triggers**:
  - Automated triggers fire on: AI Summary generation, Autonomous Coach reports, High Stress/Overwhelm moods, Breakthrough/Clarity victories, or custom keyword matches.
  - Manual triggers provide 1-click **Dispatch Direct** and **Dispatch to All Enabled** buttons.
- **Rate-Limiting & Delivery Audit**: Backend enforces a 15 dispatches/min limit per user and maintains delivery logs (`/api/notifications/logs`).

### Role-Based Access Control (RBAC) Admin Console
- **Three-Tier Hierarchy**: `owner` (full platform governance & secret configuration), `admin` (audit logs, user moderation, discrepancy analysis), and `user` (isolated tenant operations).
- **Stateless Server-Side Verification**: Auth middleware verifies JWT signatures and roles at every endpoint boundary.
- **Tamper-Evident Audit Logging**: Every administrative action (role changes, config updates, account reviews) is appended to a structured, write-once audit log.
- **Tenant Discrepancy Scanner**: Detects orphan records, role mismatches, and data synchronization anomalies with 1-click remediation.

### Voice Dictation & Multimodal Reflection
- **Browser Speech Recognition**: Integrated Web Speech API audio recording with real-time waveform visualization, auto-punctuation, and instant transcription into the active reflection canvas.
- **Image Notes & Multimodal Context**: Attach screenshots, diagram sketches, or photos to entries with dedicated visual reflection notes that are ingested into both RAG and Agent pipelines.

---

## 🔒 Threat Modeling & Security Architecture

ReflectAI applies a structured threat analysis across the **5 Core Threat Zones**:

| Threat Zone | Vulnerability Vector | Implemented Defense & Countermeasure |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection, malicious Markdown, XSS, payload tampering | Strict runtime schema parsing, null-safe destructuring (`req.body || {}`), sanitized React Markdown rendering, undefined-stripping prior to database sinks. |
| **2. Planning & Reasoning** | System instruction bypass, persona hijacking, jailbreaking | Explicit context-bounded system instructions, separated user content delimiter blocks, and deterministic temperature controls. |
| **3. Tool Execution** | Secret key leakage, SSRF, arbitrary webhook execution | Zero client-side API keys. Server-side proxy endpoints (`/api/gemini/*`, `/api/maps/*`, `/api/notifications/*`). URL validation on webhook targets with per-user rate limiting (15/min). |
| **4. Memory & State** | Cross-tenant data leaks, horizontal privilege escalation | Strict owner-bound Firestore subcollection security rules (`request.auth.uid == userId`). Stateless JWT verification on every authenticated API route. |
| **5. Inter-System Comm** | API downtime, quota exhaustion (429, 503), token interception | Resilient 4-tier model fallback ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`). Bearer token auth headers. |

---

## 🚀 Google Cloud Run Deployment & Configuration Guide

Follow these steps to deploy ReflectAI directly to Google Cloud Run in full compliance with the Google Cloud AI Challenge security standards.

### Step 1: Prerequisites & GCP API Enablement

Install the [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) and set your project:

```bash
# Set your active GCP Project ID and deployment region
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="us-central1"
export SERVICE_NAME="reflect-ai-service"

# Authenticate and set project
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com
```

---

### Step 2: Google Cloud Secret Manager Setup

Store your `GEMINI_API_KEY` (and optional `GOOGLE_MAPS_API_KEY`) securely in Secret Manager and grant the Cloud Run runtime service account read access:

```bash
# 1. Create the GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your secret version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve your project number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# 4. Grant Secret Accessor role to the default Cloud Run Compute service account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Optional: Configure Google Maps API Key
gcloud secrets create GOOGLE_MAPS_API_KEY --replication-policy="automatic"
echo -n "YOUR_MAPS_API_KEY" | gcloud secrets versions add GOOGLE_MAPS_API_KEY --data-file=-
gcloud secrets add-iam-policy-binding GOOGLE_MAPS_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### Step 3: Firestore Security Rules Deployment

Ensure your Cloud Firestore database is created in Native mode. Deploy the production security rules enforcing zero-trust user data isolation:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile and subcollections isolation
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Personal Journal Entries Subcollection
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // User Notification Channels Configuration
      match /notificationChannels/{channelId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // User Interactions & Chat History
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Default deny-all fallback
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules via Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

### Step 4: Cloud Run Deployment

Deploy the container to Cloud Run with Secret Manager environment injection:

```bash
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NODE_ENV=production \
  --port 3000
```

---

### Step 5: Mandatory Campaign Verification Labeling

Apply the mandatory challenge verification label to register your Cloud Run service for automated evaluation:

```bash
gcloud run services update $SERVICE_NAME \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

Verify that the label was successfully applied:

```bash
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="value(metadata.labels)"
```

---

## 🧪 Comprehensive Verification & Walkthrough Test Cases

Every user-facing workflow has a dedicated test walkthrough:

### Test Case 1: Landing Page & Authentication
1. Navigate to the application URL.
2. Verify the Landing Page presents the value proposition, security guarantees, and live mode badge.
3. Click **"Continue with Google Sign-In"** to sign in via Google federated identity.
4. *(Alternative / Development)*: Click **"Enter Sanctuary as Owner (Instant Preview)"** to test immediate authenticated owner privileges without waiting for Google Cloud DNS propagation.
5. Confirm seamless transition to the main dashboard.

### Test Case 2: Multi-Turn Reflection & Model Fallback
1. In the central editor, write an initial thought (e.g., *"Struggling to balance architecture refactoring with new feature sprints."*).
2. In the AI Chat panel, type: *"Help me reframe this tradeoff."* and hit Send.
3. Observe the loading state and verify Gemini's markdown-formatted response.
4. Ask a follow-up: *"What are 2 immediate actions I can take tomorrow morning?"*
5. Confirm the model retains prior context and provides specific, structured steps.

### Test Case 3: Automated Summarization & Mood Classification
1. Click the **"Auto-Summarize"** button above the editor canvas.
2. Confirm the entry generates an **Executive Summary**, identifies an emotional **Mood** (e.g. *Reflective / Strategic*), and tags key themes (e.g., `#Engineering`, `#TimeManagement`).
3. Verify that these insights appear in the top insight card and persist automatically to the entry document.

### Test Case 4: Semantic RAG Cross-Vault Search
1. Create and save at least two distinct entries (e.g., one about *"Team conflict and communication"* and one about *"Product roadmap breakthrough"*).
2. Click the **"RAG Vault Search"** button in the header navigation.
3. Enter a conceptual query: *"How do I deal with communication hurdles?"*
4. Confirm the RAG engine performs cosine similarity ranking, displays the top matched entries with similarity scores and excerpts, and synthesizes a direct answer citing specific entries by name and date.

### Test Case 5: Autonomous AI Reflection Agents
1. Click the **"AI Agents"** button in the navigation bar.
2. Select an agent persona (e.g., **"Cognitive Distortion & Reframing Auditor"**).
3. Select scope: **"All Vault Entries"** or **"Active Entry"**.
4. Click **"Run Agent Analysis"**.
5. Observe the streaming thought-process steps, followed by the structured report highlighting cognitive traps, reality testing, and Socratic reframing questions.

### Test Case 6: Model Context Protocol (MCP) Hub
1. Click the **"MCP Hub"** button in the top navigation.
2. Review the 4 registered MCP tool definitions and their parameters.
3. Select the **"Google Calendar & Schedule MCP"** and click **"Execute Tool"**.
4. Verify the tool calculates meeting density, fatigue index, and recommends an optimal reflection slot.
5. Click **"Inject into Agent Context"** and run the Growth Coach to see schedule metrics synthesized into personal growth advice.

### Test Case 7: Location-Aware Pinning via Google Maps Proxy
1. In an open reflection entry, click the **Location Pin** icon.
2. Type a location query (e.g., *"Central Park, New York"* or *"Mission District, San Francisco"*).
3. Select the matching result from the auto-suggest list.
4. Verify the coordinate coordinates and human-readable place label are securely attached to the entry via the server-side proxy.

### Test Case 8: External Notification Routing (Discord Webhook)
1. Click the **Notifications (Bell)** icon in the header.
2. Under **"Channels & Integrations"**, verify or enter a Discord Webhook URL.
3. Ensure the channel toggle is set to **Active / Enabled**.
4. Switch to the **"Dispatch Current Entry"** tab.
5. Click **"Dispatch Direct"** on the Discord card or **"Dispatch to All Enabled"**.
6. Check your Discord channel to verify the structured embed arrives with the reflection title, mood tag, and key insights.

### Test Case 9: Role-Based Access Control (RBAC) Admin Console
1. Click the **"RBAC Console"** button (visible to `owner` and `admin` roles).
2. Inspect the **Role Management** tab, **System Audit Logs**, **Moderation Reports**, and **Discrepancy Scanner**.
3. Run a **Discrepancy Scan** and confirm tenant database integrity checks pass.
4. Verify every administrative action is appended to the tamper-evident audit log.

### Test Case 10: Real-Time Cloud Persistence & Local Cache Recovery
1. Edit any entry; verify the status pill indicates **"Saved to Firestore"**.
2. Reload the browser window.
3. Confirm the active entry, conversation history, mood tags, and attached location reload without data loss.
4. In case of intermittent offline connectivity, verify the local storage fallback layer preserves edits and synchronizes once reconnected.

---

## 📡 Server API Endpoint Catalog

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | No | System health check and Gemini API key presence validator. |
| `/api/gemini/reflect` | `POST` | No / Optional | Multi-turn conversational reflection with model fallback ladder. |
| `/api/gemini/summarize-entry` | `POST` | No / Optional | Extracts executive summary, mood, theme pills, and action items. |
| `/api/rag/query` | `POST` | No / Optional | TF-IDF / Cosine similarity search and synthesis across entry records. |
| `/api/agent/run` | `POST` | No / Optional | Executes one of four specialized autonomous reflection agents. |
| `/api/mcp/tools` | `GET` | No | Lists all registered Model Context Protocol tool definitions. |
| `/api/mcp/execute` | `POST` | No | Executes an MCP tool (Calendar, Obsidian, GitHub, Biometrics). |
| `/api/maps/geocode` | `GET` | No | Server-side proxy for Google Maps address-to-coordinate geocoding. |
| `/api/maps/reverse-geocode` | `GET` | No | Server-side proxy for Google Maps coordinate-to-address geocoding. |
| `/api/maps/places-search` | `GET` | No | Server-side proxy for Google Places autocomplete and location search. |
| `/api/notifications/config` | `GET` / `POST` | Yes (`Bearer`) | Retrieves or updates user-isolated notification channel configs. |
| `/api/notifications/test` | `POST` | Yes (`Bearer`) | Sends a diagnostic test notification to a specific channel. |
| `/api/notifications/dispatch` | `POST` | Yes (`Bearer`) | Dispatches reflection events based on automated rules or manual triggers. |
| `/api/notifications/logs` | `GET` | Yes (`Bearer`) | Retrieves per-user outbound notification delivery logs. |
| `/api/rbac/me` | `GET` | Yes (`Bearer`) | Retrieves current authenticated role and token permissions. |
| `/api/rbac/roles` | `GET` | Yes (`owner`, `admin`) | Lists user roles and platform assignment status. |
| `/api/rbac/set-role` | `POST` | Yes (`owner`) | Updates role privileges for a tenant account. |
| `/api/rbac/audit-logs` | `GET` / `POST` | Yes (`owner`, `admin`) | Retrieves or appends tamper-evident administrative audit logs. |
| `/api/rbac/discrepancies` | `GET` / `POST` | Yes (`owner`, `admin`) | Scans and rectifies tenant record synchronization discrepancies. |

---

## 📄 License
Licensed under the [Apache License, Version 2.0](LICENSE).
