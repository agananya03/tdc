# The Divine Connection - Matchmaker Portal

A premium matrimonial matchmaker administration portal designed for **The Divine Connection (TDC)** matching agency. This portal enables matchmakers to manage clients, browse candidate profiles, run compatibility scoring engines, log consult updates, and utilize AI reasoning tools to generate matching insights and draft custom introduction emails.

---

## 🚀 Quick Start & Installation

Ensure you have [Node.js](https://nodejs.org/) installed (v18 or higher is recommended).

1. **Clone the Repository** and navigate to the project directory:
   ```bash
   cd tdc_assignment
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables (Optional)**:
   Create a `.env` file in the root directory and add your Anthropic API Key to enable live Claude integration. If no key is set, the system automatically falls back to a simulated, high-fidelity word-by-word streaming generator for offline testing:
   ```env
   ANTHROPIC_API_KEY=your_claude_api_key_here
   ```
4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
5. **Open the Application**:
   Navigate to [http://localhost:3000](http://localhost:3000) (or the port indicated in your console) to view the portal.

---

## 🔐 Authentication Credentials

To access the portal, use the following administrator matchmaker credentials:

* **Email**: `admin@tdc.com`
* **Password**: `tdc2024`

---

## 🛠️ Technology Stack

The application is built on a modern, highly performant stack:
* **Framework**: Next.js 14 (App Router) utilizing Server-Side Rendering (SSR) and Edge API routes.
* **Language**: TypeScript for absolute type safety.
* **Styling**: Tailwind CSS v4 for clean, expressive styling.
* **Animations**: Framer Motion for premium micro-interactions and smooth page transitions.
* **State Management**: Zustand for client-side session authentication storage.
* **Icons**: Lucide React for consistent vector symbols.

---

## 📘 Technical Architecture & Engineering Decisions

### 1. Next.js + TypeScript Choice for Type Safety and Server-Side Rendering
Selecting Next.js 14 and TypeScript was a critical architectural choice for this matrimonial platform. TypeScript enforces strict validation across complex, deeply nested user profile interfaces (e.g., gotras, caste designations, manglik statuses, relocation metrics), eliminating runtime crashes during profile scoring and rendering. The Next.js App Router structure enables seamless hybrid rendering: static assets are loaded instantly, and Edge-runtime API routes facilitate low-latency, server-sent streaming for AI-generated assets. This setup guarantees that the matchmaker experiences zero sluggishness, even when parsing heavy JSON database pools, while keeping the client's device load to an absolute minimum.

### 2. Gender-Specific Weighted Matching Engine & Cultural Considerations
The matchmaking scoring engine (`/lib/matchingEngine.ts`) implements a specialized, weighted matching algorithm tailored to traditional Indian matchmaking paradigms. Recognizing that compatibility factors carry different weights depending on the gender of the client, the engine executes distinct scoring calculations. For male clients scoring female pool candidates, weight is distributed toward age compatibility (20 pts), height (15 pts), relocation openness (10 pts), and religion (10 pts). Conversely, female clients scoring male candidates prioritize profession tier alignment (20 pts), income compatibility (15 pts), relocation openness (15 pts), and manglik compatibility (5 pts). Both profiles share mutual scoring weights for lifestyle indicators like diet preference, family values, wantKids desires, and mother tongue overlap. This cultural prioritization yields highly realistic compatibility tiers ("High Potential", "Good Match", "Potential Match") that align with practical matchmaking workflows.

### 3. Cognitive Natural Language Match Reasoning via Claude API
While raw mathematical scores form the foundation of compatibility analysis, they fail to convey the qualitative nuances of human relationships. To bridge this gap, the portal utilizes Anthropic's Claude API (`claude-sonnet-4-20250514`) via Edge streaming route handlers (`/app/api/ai/...`). Clicking the "AI Insight" button triggers a streaming request that reads Claude's analysis in real-time, explaining exactly *why* a pair is compatible (e.g. highlighting overlap in career ambitions or diet) and flagging specific topics to discuss (e.g. alignment on joint family living). In the dispatch modal, the matchmaker can trigger a streaming email draft, populated with custom reasoning, which remains fully editable within a React textarea. This gives the matchmaker cognitive support, translating raw scoring figures into empathetic, professional relationship explanations.
