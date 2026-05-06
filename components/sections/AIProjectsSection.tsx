"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  Github,
  MapPin,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type DemoStep = {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  method: "POST";
  sourceUrl: string;
  samplePayload: Record<string, unknown>;
  sampleOutput: Record<string, unknown>;
};

const BASE_API_URL = "http://localhost:3000/api";
const STARTER_REPO_URL =
  "https://github.com/satyavamsi/langchain-nodejs-starter";

const DEMO_STEPS: DemoStep[] = [
  {
    id: "llm-story",
    title: "LLM Invocation",
    description: "Generate a short story from a prompt using a base LLM call.",
    endpoint: "/llm/story",
    method: "POST",
    sourceUrl: `${STARTER_REPO_URL}/blob/main/src/routes/llm.routes.ts`,
    samplePayload: {},
    sampleOutput: {
      success: true,
      data: {
        text: "In 2030, teams hire AI copilots before hiring interns. We build adaptive copilots that learn your company's workflow in hours.",
      },
    },
  },
  {
    id: "llm-embeddings",
    title: "Embedding Generation",
    description:
      "Turn text into vectors for retrieval, clustering, and semantic search.",
    endpoint: "/llm/embeddings",
    method: "POST",
    sourceUrl: `${STARTER_REPO_URL}/blob/main/src/routes/llm.routes.ts`,
    samplePayload: { input: "Hello, world!" },
    sampleOutput: {
      success: true,
      data: {
        dimensions: 1536,
        preview: [0.017, -0.003, 0.041, -0.012, 0.008, 0.026],
      },
    },
  },
  {
    id: "rag-query",
    title: "RAG Pipeline",
    description:
      "Retrieve indexed context first, then answer grounded in source documents.",
    endpoint: "/rag/query",
    method: "POST",
    sourceUrl: `${STARTER_REPO_URL}/blob/main/src/routes/rag.routes.ts`,
    samplePayload: { query: "When NovaS was launched?" },
    sampleOutput: {
      success: true,
      data: {
        answer:
          "Install dependencies, run ChromaDB, configure .env, and start the API server.",
        citations: ["README.md", "src/services/rag.service.ts"],
      },
    },
  },
  {
    id: "semantic-search",
    title: "Semantic Search",
    description: "Find meaning-based matches instead of exact keyword matches.",
    endpoint: "/rag/semantic/query",
    method: "POST",
    sourceUrl: `${STARTER_REPO_URL}/blob/main/src/routes/rag.routes.ts`,
    samplePayload: { query: "By 2019, how many employees were there?" },
    sampleOutput: {
      success: true,
      data: {
        matches: [
          {
            score: 0.93,
            text: "Run npm run dev after setting OPENAI_API_KEY.",
          },
          { score: 0.88, text: "Start ChromaDB with docker compose up -d." },
        ],
      },
    },
  },
  {
    id: "tool-binding",
    title: "Tool Binding + Agent Flow",
    description:
      "Expose tools to an agent and let it reason over next best actions.",
    endpoint: "/agent/tool-binding",
    method: "POST",
    sourceUrl: `${STARTER_REPO_URL}/blob/main/src/routes/agent.routes.ts`,
    samplePayload: { query: "What's the age of John Doe?" },
    sampleOutput: {
      success: true,
      data: {
        thought: "Need to call setup helper and docs lookup.",
        toolCalls: ["getSetupSteps", "fetchDocsOverview"],
        final:
          "Setup is complete. Next: test /llm/story and /rag/query endpoints.",
      },
    },
  },
];

export function AIProjectsSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState(BASE_API_URL);
  const [activeStepId, setActiveStepId] = useState(DEMO_STEPS[0].id);
  const [loading, setLoading] = useState(false);
  const [liveResult, setLiveResult] = useState<string | null>(null);
  const [editablePayload, setEditablePayload] = useState(
    JSON.stringify(DEMO_STEPS[0].samplePayload, null, 2),
  );

  const activeStep = useMemo(
    () => DEMO_STEPS.find((step) => step.id === activeStepId) ?? DEMO_STEPS[0],
    [activeStepId],
  );

  const runLiveDemo = async () => {
    setLoading(true);
    setLiveResult(null);
    try {
      let parsedPayload: Record<string, unknown>;
      try {
        parsedPayload = JSON.parse(editablePayload) as Record<string, unknown>;
      } catch {
        setLiveResult(
          JSON.stringify(
            {
              success: false,
              message:
                "Invalid JSON in request body. Please update the payload and try again.",
            },
            null,
            2,
          ),
        );
        setLoading(false);
        return;
      }

      const response = await fetch(`${baseUrl}${activeStep.endpoint}`, {
        method: activeStep.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedPayload),
      });

      const result = await response.json();
      setLiveResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setLiveResult(
        JSON.stringify(
          {
            success: false,
            message:
              "Live request failed. Keep using sample outputs or run the starter locally to test endpoints.",
            error: error instanceof Error ? error.message : "Unknown error",
          },
          null,
          2,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="ai-projects" className="py-20 px-6">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* ── AI Travel Planner card ── */}
        <div className="rounded-2xl border bg-card p-8 md:p-10 space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-primary" />
                AI Projects Showcase
              </p>
              <h2 className="text-3xl md:text-4xl font-bold">
                AI Travel Planner
              </h2>
              <p className="max-w-3xl text-muted-foreground">
                A LangGraph-powered travel planning agent that spins up a
                directed graph of specialised nodes — geocoding, itinerary
                planning, hotel search, weather fetch — running in parallel and
                streaming results in real time.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {["LangGraph", "Streaming", "Node Agents", "OpenAI"].map(
                  (tag) => (
                    <span key={tag} className="rounded-md bg-muted px-2.5 py-1">
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link href="/ai-travel-planner">Open Interactive Demo</Link>
              </Button>
              <Button asChild variant="outline">
                <a
                  href="https://github.com/satyavamsi/ai-travel-planner"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="size-4" />
                  View Source
                </a>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border bg-black aspect-video w-full">
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/t9NBg3VxUa0?si=KWl9hUttoyg24hMU"
              title="AI Travel Planner Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>

        {/* ── LangChain card ── */}
        <div className="rounded-2xl border bg-card p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                AI Projects Showcase
              </p>
              <h2 className="text-3xl md:text-4xl font-bold">
                LangChain Integration Walkthrough
              </h2>
              <p className="max-w-3xl text-muted-foreground">
                Explore each stage of the AI pipeline from LLM calls to
                embeddings, RAG, semantic search, and tool-driven agents. This
                UI uses curated sample outputs to avoid token burn while still
                showing the full backend flow.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  "LangChain",
                  "LangGraph",
                  "RAG",
                  "Semantic Search",
                  "Agents",
                ].map((tag) => (
                  <span key={tag} className="rounded-md bg-muted px-2.5 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setIsOpen(true)}>
                Open Interactive Demo
              </Button>
              <Button asChild variant="outline">
                <Link
                  href={STARTER_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="size-4" />
                  View Source
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-4xl"
        >
          <SheetHeader className="border-b">
            <SheetTitle>AI Projects - API Walkthrough</SheetTitle>
            <SheetDescription>
              Step through each endpoint with sample request/response payloads,
              then jump into source code for full integration and testing.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 p-4">
            <div className="grid gap-2 md:grid-cols-5">
              {DEMO_STEPS.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setActiveStepId(step.id);
                    setEditablePayload(
                      JSON.stringify(step.samplePayload, null, 2),
                    );
                    setLiveResult(null);
                  }}
                  className={`rounded-lg border p-3 text-left transition ${
                    activeStepId === step.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <p className="text-sm font-medium">{step.title}</p>
                </button>
              ))}
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{activeStep.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {activeStep.description}
                </p>
                <p className="inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs">
                  <Terminal className="size-3.5" />
                  {activeStep.method} {activeStep.endpoint}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sample Request
                  </p>
                  <pre className="max-h-60 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                    {JSON.stringify(activeStep.samplePayload, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sample Response
                  </p>
                  <pre className="max-h-60 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                    {JSON.stringify(activeStep.sampleOutput, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Optional live endpoint check
                </p>
                <p className="mt-1">
                  Clone the GitHub starter, run the Node.js server locally, then
                  come back here to visualize each step against live endpoints.
                </p>
                <label htmlFor="base-url" className="mt-3 block">
                  API Base URL
                </label>
                <input
                  id="base-url"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                />
                <label htmlFor="request-json" className="mt-3 block">
                  Request JSON (editable)
                </label>
                <textarea
                  id="request-json"
                  className="mt-1 min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                  value={editablePayload}
                  onChange={(event) => setEditablePayload(event.target.value)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={runLiveDemo} disabled={loading} size="sm">
                    {loading ? "Running..." : "Try Live API"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditablePayload(
                        JSON.stringify(activeStep.samplePayload, null, 2),
                      );
                      setLiveResult(null);
                    }}
                  >
                    Reset Request
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={activeStep.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Source for this endpoint
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                </div>
                {liveResult && (
                  <pre className="mt-3 max-h-60 overflow-auto rounded-md border bg-background p-3 text-xs">
                    {liveResult}
                  </pre>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-semibold">Watch Backend Demo</h4>
              <p className="text-xs text-muted-foreground">
                Replace the video ID in this sample embed with your final
                YouTube walkthrough.
              </p>
              <div className="overflow-hidden rounded-lg border bg-black aspect-video">
                <iframe
                  className="h-full w-full"
                  src="https://www.youtube.com/embed/3fednbQLor4"
                  title="LangChain Starter Backend Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
