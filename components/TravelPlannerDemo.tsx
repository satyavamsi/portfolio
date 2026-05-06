"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bed,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  Cloud,
  ExternalLink,
  Github as GithubIcon,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  UtensilsCrossed,
  Wallet,
  Wind,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeState = "idle" | "running" | "complete" | "error";

interface GraphNodeData {
  id: string;
  label: string;
  description: string;
  state: NodeState;
  isParallel: boolean;
}

interface TopologyNode {
  id: string;
  label: string;
  description: string;
  parallel?: boolean;
}

interface TopologyEdge {
  from: string;
  to: string;
  type: "sequential" | "parallel";
}

interface StreamEvent {
  type:
    | "graph_start"
    | "node_start"
    | "node_complete"
    | "node_error"
    | "graph_complete";
  node?: string;
  topology?: { nodes: TopologyNode[]; edges: TopologyEdge[] };
  state?: Record<string, unknown>;
}

interface LogEntry {
  type: string;
  message: string;
}

interface PlaceItem {
  name: string;
  mapsLink: string;
  snippet?: string;
}

interface EatItem {
  name: string;
  mapsLink: string;
  cuisine?: string;
  snippet?: string;
}

interface StayItem {
  name: string;
  mapsLink: string;
  bookingSearchLink: string;
  snippet: string;
}

interface DayPlan {
  day: number;
  see: PlaceItem[];
  eat: EatItem[];
  stay: StayItem;
}

interface OptimizedPlan {
  destination: string;
  budget: number;
  currency?: string;
  tripDays: number;
  dayPlans: DayPlan[];
}

interface WeatherData {
  current_weather?: {
    temperature?: number;
    windspeed?: number;
    weathercode?: number;
    is_day?: number;
  };
}

// ─── Currency helpers ─────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
  AUD: "A$", CAD: "C$", SGD: "S$", THB: "฿", MYR: "RM",
  IDR: "Rp", PHP: "₱", KRW: "₩",
};

function currencySymbol(code: string | undefined): string {
  return CURRENCY_SYMBOLS[code?.toUpperCase() ?? ""] ?? (code ? `${code} ` : "$");
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PREBUILT_QUERIES = [
  {
    label: "Stockholm under $2000",
    query: "Plan a budget trip to Stockholm under 2000 usd",
    file: "stockholm",
    emoji: "🇸🇪",
  },
  {
    label: "7 days in Spain",
    query: "Give me 7 day itenary to Spain",
    file: "spain",
    emoji: "🇪🇸",
  },
  {
    label: "New York under $1000",
    query:
      "Suggest me places and hotels to visit during my time in new york for 3 days under 1000 usd",
    file: "newyork",
    emoji: "🗽",
  },
];

const LIVE_API_URL = "http://localhost:3000/plan/stream";
const GITHUB_URL = "https://github.com/satyavamsi/ai-travel-planner";

const eventToNodeId = (name: string) => `${name}_node`;

// ─── Graph layout ─────────────────────────────────────────────────────────────

const NODE_LAYOUT: Record<string, { cx: number; cy: number; isParallel: boolean }> = {
  intent_node:      { cx: 240, cy: 40,  isParallel: false },
  extract_node:     { cx: 240, cy: 110, isParallel: false },
  geo_node:         { cx: 240, cy: 180, isParallel: false },
  planner_node:     { cx: 240, cy: 250, isParallel: false },
  places_node:      { cx: 40,  cy: 360, isParallel: true  },
  hotels_node:      { cx: 140, cy: 360, isParallel: true  },
  restaurants_node: { cx: 240, cy: 360, isParallel: true  },
  weather_node:     { cx: 340, cy: 360, isParallel: true  },
  budget_node:      { cx: 440, cy: 360, isParallel: true  },
  optimizer_node:   { cx: 240, cy: 460, isParallel: false },
  final_node:       { cx: 240, cy: 530, isParallel: false },
};

const EDGES: Array<[string, string]> = [
  ["intent_node", "extract_node"],
  ["extract_node", "geo_node"],
  ["geo_node", "planner_node"],
  ["planner_node", "places_node"],
  ["planner_node", "hotels_node"],
  ["planner_node", "restaurants_node"],
  ["planner_node", "weather_node"],
  ["planner_node", "budget_node"],
  ["places_node", "optimizer_node"],
  ["hotels_node", "optimizer_node"],
  ["restaurants_node", "optimizer_node"],
  ["weather_node", "optimizer_node"],
  ["budget_node", "optimizer_node"],
  ["optimizer_node", "final_node"],
];

const NW = 88;
const NH = 26;
const PW = 74;
const PH = 24;

// ─── SVG pipeline graph ───────────────────────────────────────────────────────

function PipelineGraph({ nodes }: { nodes: GraphNodeData[] }) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const edgeColor = (toId: string) => {
    const s = nodeMap.get(toId)?.state ?? "idle";
    if (s === "complete") return "#22c55e";
    if (s === "running") return "#3b82f6";
    if (s === "error") return "#ef4444";
    return "currentColor";
  };

  const strokeStyle = (toId: string): React.CSSProperties => {
    const s = nodeMap.get(toId)?.state ?? "idle";
    return s === "idle" ? { strokeDasharray: "4 3", opacity: 0.3 } : {};
  };

  return (
    <svg
      viewBox="0 0 480 580"
      className="w-full"
      aria-label="LangGraph pipeline"
    >
      {EDGES.map(([f, t]) => {
        const fp = NODE_LAYOUT[f];
        const tp = NODE_LAYOUT[t];
        if (!fp || !tp) return null;
        return (
          <line
            key={`${f}-${t}`}
            x1={fp.cx}
            y1={fp.cy + (fp.isParallel ? PH : NH) / 2}
            x2={tp.cx}
            y2={tp.cy - (tp.isParallel ? PH : NH) / 2}
            stroke={edgeColor(t)}
            strokeWidth={1.5}
            style={strokeStyle(t)}
          />
        );
      })}

      {nodes.map((n) => {
        const p = NODE_LAYOUT[n.id];
        if (!p) return null;
        const w = n.isParallel ? PW : NW;
        const h = n.isParallel ? PH : NH;

        const colors = {
          idle:     { stroke: "currentColor", fill: "transparent", text: "currentColor", opacity: 0.25 },
          running:  { stroke: "#3b82f6", fill: "#dbeafe",  text: "#1d4ed8", opacity: 1 },
          complete: { stroke: "#22c55e", fill: "#dcfce7",  text: "#15803d", opacity: 1 },
          error:    { stroke: "#ef4444", fill: "#fee2e2",  text: "#b91c1c", opacity: 1 },
        }[n.state];

        return (
          <g key={n.id} opacity={colors.opacity}>
            {n.state === "running" && (
              <rect
                x={p.cx - w / 2 - 4}
                y={p.cy - h / 2 - 4}
                width={w + 8}
                height={h + 8}
                rx={8}
                fill="#3b82f6"
                opacity={0}
              >
                <animate
                  attributeName="opacity"
                  values="0;0.15;0"
                  dur="1.4s"
                  repeatCount="indefinite"
                />
              </rect>
            )}
            <rect
              x={p.cx - w / 2}
              y={p.cy - h / 2}
              width={w}
              height={h}
              rx={5}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={1.5}
            />
            <text
              x={p.cx}
              y={p.cy + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={n.isParallel ? 7 : 8}
              fontWeight={500}
              fill={colors.text}
              fontFamily="inherit"
            >
              {n.label}
            </text>
          </g>
        );
      })}

      <text
        x={240}
        y={320}
        textAnchor="middle"
        fontSize={8}
        opacity={0.4}
        fill="currentColor"
        fontFamily="inherit"
        letterSpacing={1}
      >
        PARALLEL
      </text>
    </svg>
  );
}

// ─── Streaming helpers ────────────────────────────────────────────────────────

async function* streamDemo(file: string): AsyncGenerator<StreamEvent> {
  const res = await fetch(`/demos/${file}.ndjson`);
  const text = await res.text();
  for (const line of text.trim().split("\n").filter(Boolean)) {
    const event = JSON.parse(line) as StreamEvent;
    await new Promise((r) =>
      setTimeout(
        r,
        event.type === "graph_start"     ? 300
        : event.type === "node_start"    ? 500
        : event.type === "node_complete" ? 700
        : 300,
      ),
    );
    yield event;
  }
}

async function* streamLive(query: string, url: string): AsyncGenerator<StreamEvent> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: query }),
  });
  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line) as StreamEvent;
    }
  }
}

// ─── Result UI sub-components ─────────────────────────────────────────────────

function PriceTag({ snippet }: { snippet?: string }) {
  const match = snippet?.match(/^\$+/);
  if (!match) return null;
  return (
    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
      {match[0]}
    </span>
  );
}

function PlaceCard({ place }: { place: PlaceItem }) {
  return (
    <a
      href={place.mapsLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
    >
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
        <MapPin className="size-3.5 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors truncate">
            {place.name}
          </p>
          <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
        </div>
        {place.snippet && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {place.snippet}
          </p>
        )}
      </div>
    </a>
  );
}

function EatCard({ place }: { place: EatItem }) {
  const cleanSnippet = place.snippet?.replace(/^\$+\s*—\s*/, "");
  return (
    <a
      href={place.mapsLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
    >
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
        <UtensilsCrossed className="size-3.5 text-orange-600 dark:text-orange-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors truncate">
              {place.name}
            </p>
            <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
          {(place.snippet || place.cuisine) && (
            <div className="flex items-center gap-1.5 shrink-0">
              <PriceTag snippet={place.snippet} />
              {place.cuisine && <span className="text-xs text-muted-foreground">{place.cuisine}</span>}
            </div>
          )}
        </div>
        {cleanSnippet && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {cleanSnippet}
          </p>
        )}
      </div>
    </a>
  );
}

function StayCard({ stay }: { stay: StayItem }) {
  const cleanSnippet = stay.snippet?.replace(/^hostel\s*·\s*\$+\s*—\s*/i, "");
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
        <Bed className="size-3.5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <a
              href={stay.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
            >
              {stay.name}
              <ExternalLink className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </a>
            {cleanSnippet && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {cleanSnippet}
              </p>
            )}
          </div>
          <a
            href={stay.bookingSearchLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Book →
          </a>
        </div>
      </div>
    </div>
  );
}

function DayCard({ plan }: { plan: DayPlan }) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
          {plan.day}
        </div>
        <div>
          <p className="text-sm font-semibold">Day {plan.day}</p>
          <p className="text-xs text-muted-foreground">
            {plan.see.length} sights · {plan.eat.length} restaurants
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* What to see */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-950">
              <Building2 className="size-3 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              What to See
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {plan.see.map((p) => (
              <PlaceCard key={p.name} place={p} />
            ))}
          </div>
        </div>

        {/* Where to eat */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-950">
              <UtensilsCrossed className="size-3 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Where to Eat
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {plan.eat.map((r) => (
              <EatCard key={r.name} place={r} />
            ))}
          </div>
        </div>

        {/* Where to stay */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950">
              <Bed className="size-3 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Where to Stay
            </p>
          </div>
          <StayCard stay={plan.stay} />
        </div>
      </div>
    </div>
  );
}

function TripSummaryHeader({
  plan,
  weather,
  currency,
}: {
  plan: OptimizedPlan;
  weather: WeatherData | null;
  currency: string | undefined;
}) {
  const temp = weather?.current_weather?.temperature;
  const wind = weather?.current_weather?.windspeed;
  const sym = currencySymbol(plan.currency ?? currency);
  const budgetDisplay = plan.budget != null ? `${sym}${plan.budget.toLocaleString()}` : null;

  return (
    <div className="rounded-2xl border bg-linear-to-br from-primary/5 via-background to-background p-6 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="size-4 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">
              {plan.destination}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Your personalised travel plan
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Duration</p>
              <p className="text-sm font-semibold">{plan.tripDays} days</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2">
            <Wallet className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Budget</p>
              <p className="text-sm font-semibold">{budgetDisplay}</p>
            </div>
          </div>
          {temp !== undefined && (
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2">
              <Cloud className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Weather</p>
                <p className="text-sm font-semibold">{temp}°C</p>
              </div>
              {wind !== undefined && (
                <div className="border-l pl-3 ml-1">
                  <Wind className="size-4 text-muted-foreground" />
                  <p className="text-xs font-medium mt-0.5">{wind} km/h</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TravelPlannerDemo() {
  const [graphNodes, setGraphNodes] = useState<GraphNodeData[]>([]);
  const [query, setQuery] = useState("");
  const [selectedPrebuilt, setSelectedPrebuilt] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [liveApiUrl, setLiveApiUrl] = useState(LIVE_API_URL);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [plan, setPlan] = useState<OptimizedPlan | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currency, setCurrency] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const appendLog = useCallback((entry: LogEntry) => {
    setLog((prev) => [...prev, entry]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const setNodeState = useCallback((nodeId: string, state: NodeState) => {
    setGraphNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, state } : n)),
    );
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setGraphNodes([]);
    setLog([]);
    setPlan(null);
    setWeather(null);
    setCurrency(undefined);
    setError(null);
    setRunning(false);
  }, []);

  const run = useCallback(async () => {
    if (!query.trim()) return;
    abortRef.current = false;
    setRunning(true);
    setLog([]);
    setPlan(null);
    setWeather(null);
    setCurrency(undefined);
    setError(null);
    setGraphNodes([]);

    const labelCache = new Map<string, string>();

    try {
      const preset = PREBUILT_QUERIES.find((p) => p.query === query);
      const stream = liveMode
        ? streamLive(query, liveApiUrl)
        : preset
          ? streamDemo(preset.file)
          : streamDemo("stockholm");

      for await (const event of stream) {
        if (abortRef.current) break;

        if (event.type === "graph_start" && event.topology) {
          const initNodes: GraphNodeData[] = event.topology.nodes.map((n) => {
            labelCache.set(n.id, n.label);
            return { id: n.id, label: n.label, description: n.description, state: "idle", isParallel: !!n.parallel };
          });
          setGraphNodes(initNodes);
          appendLog({ type: "graph_start", message: "Pipeline started" });
        }

        if (event.type === "node_start" && event.node) {
          const id = eventToNodeId(event.node);
          setNodeState(id, "running");
          appendLog({ type: "node_start", message: `▶ ${labelCache.get(id) ?? event.node}` });
        }

        if (event.type === "node_complete" && event.node) {
          const id = eventToNodeId(event.node);
          setNodeState(id, "complete");
          appendLog({ type: "node_complete", message: `✓ ${labelCache.get(id) ?? event.node}` });

          if (event.node === "final" && event.state) {
            const rawPlan = event.state.optimizedPlan;
            if (rawPlan) {
              try {
                setPlan(
                  typeof rawPlan === "string"
                    ? (JSON.parse(rawPlan) as OptimizedPlan)
                    : (rawPlan as OptimizedPlan),
                );
              } catch { /* ignore */ }
            }
            const rawWeather = event.state.weather;
            if (rawWeather) setWeather(rawWeather as WeatherData);
            const rawCurrency = event.state.currency;
            if (typeof rawCurrency === "string") setCurrency(rawCurrency);
          }
        }

        if (event.type === "node_error" && event.node) {
          const id = eventToNodeId(event.node);
          setNodeState(id, "error");
          appendLog({ type: "node_error", message: `✕ ${labelCache.get(id) ?? event.node}` });
        }

        if (event.type === "graph_complete") {
          appendLog({ type: "graph_complete", message: "Done." });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(
        liveMode
          ? `Could not reach ${liveApiUrl} — ${msg}. Make sure the server is running.`
          : `Demo error: ${msg}`,
      );
    } finally {
      if (!abortRef.current) setRunning(false);
    }
  }, [query, liveMode, appendLog, setNodeState]);

  const hasGraph = graphNodes.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md px-5 py-3.5 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Portfolio
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MapPin className="size-3.5" />
          </div>
          <span className="font-semibold text-sm">AI Travel Planner</span>
          <span className="hidden sm:inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-950 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
            LangGraph
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <GithubIcon className="size-3.5" />
              <span className="hidden sm:inline">Source</span>
            </a>
          </Button>
        </div>
      </header>

      {/* ── Description banner ── */}
      <div className="border-b bg-muted/20 px-6 py-4">
        <p className="text-sm text-muted-foreground max-w-3xl">
          A LangGraph-powered travel planning agent that spins up 11 specialised
          nodes — geocoding, itinerary planning, attractions, restaurants, hotels,
          weather, and multi-currency budget estimation — running in parallel and
          streaming results in real time.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["LangGraph", "Streaming", "Node Agents", "OpenAI"].map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-2.5 py-1 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* ── Left half: Graph + Log ── */}
        <aside className="lg:w-1/2 lg:shrink-0 lg:border-r flex flex-col bg-muted/10 lg:sticky lg:top-14.25 lg:max-h-[calc(100vh-57px)] lg:overflow-y-auto">
          {/* Graph */}
          <div className="px-6 pt-5 pb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Agent Pipeline
            </p>
            {hasGraph ? (
              <PipelineGraph nodes={graphNodes} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <div className="flex size-14 items-center justify-center rounded-2xl border-2 border-dashed">
                  <BookOpen className="size-6 opacity-25" />
                </div>
                <p className="text-xs text-center max-w-40">
                  Run a query to see the agent graph
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-6 py-3 border-t flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            {[
              { cls: "bg-gray-300 dark:bg-gray-600", label: "Idle" },
              { cls: "bg-blue-500",  label: "Running" },
              { cls: "bg-green-500", label: "Done" },
              { cls: "bg-red-500",   label: "Error" },
            ].map((s) => (
              <span key={s.label} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", s.cls)} />
                {s.label}
              </span>
            ))}
          </div>

          {/* Pipeline log */}
          {log.length > 0 && (
            <div className="border-t px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Log
              </p>
              <div className="space-y-0.5 max-h-52 overflow-y-auto font-mono text-xs">
                {log.map((entry, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                    key={i}
                    className={cn(
                      "flex items-center gap-1.5",
                      entry.type === "node_complete"  && "text-green-600 dark:text-green-400",
                      entry.type === "node_start"     && "text-blue-500",
                      entry.type === "node_error"     && "text-red-500",
                      (entry.type === "graph_start" || entry.type === "graph_complete") && "text-muted-foreground",
                    )}
                  >
                    <span className="opacity-40 shrink-0">›</span>
                    {entry.message}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {running && (
            <div className="border-t px-6 py-3 flex items-center gap-2 text-xs text-blue-500">
              <Loader2 className="size-3.5 animate-spin" />
              Planning your trip…
            </div>
          )}
        </aside>

        {/* ── Right half: Query + Results ── */}
        <main className="lg:w-1/2 lg:shrink-0 min-h-0 overflow-y-auto">
          {/* Query panel */}
          <div className="border-b bg-background">
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Prebuilt queries
                  <span className="ml-2 font-normal normal-case tracking-normal opacity-70">
                    — pre-recorded, no API key needed
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {PREBUILT_QUERIES.map((p) => (
                    <button
                      key={p.file}
                      type="button"
                      disabled={running}
                      onClick={() => {
                        setQuery(p.query);
                        setSelectedPrebuilt(p.file);
                        setLiveMode(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all",
                        selectedPrebuilt === p.file && !liveMode
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "hover:border-primary/30 hover:bg-accent",
                        running && "pointer-events-none opacity-50",
                      )}
                    >
                      <span>{p.emoji}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={query}
                    disabled={running || (!liveMode && !!selectedPrebuilt)}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedPrebuilt(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && !running && run()}
                    placeholder={
                      liveMode
                        ? "Type your travel query…"
                        : "Select a prebuilt query, or enable Live Mode to type your own"
                    }
                    className="w-full h-10 rounded-xl border bg-background pl-4 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLiveMode((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all whitespace-nowrap",
                      liveMode
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                        : "hover:bg-accent text-muted-foreground",
                    )}
                  >
                    <Zap className={cn("size-3.5", liveMode && "fill-amber-500 text-amber-500")} />
                    Live Mode
                  </button>

                  {running ? (
                    <Button variant="outline" onClick={reset} className="rounded-xl h-10 px-4">
                      <RefreshCw className="size-4" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      disabled={!query.trim()}
                      onClick={run}
                      className="rounded-xl h-10 px-5 gap-2"
                    >
                      <Play className="size-4 fill-current" />
                      Plan Trip
                    </Button>
                  )}
                </div>
              </div>

              {liveMode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 space-y-2.5">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Live mode — streams real responses from your local server
                  </p>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="live-api-url"
                      className="text-xs text-amber-700 dark:text-amber-400 shrink-0"
                    >
                      Stream URL
                    </label>
                    <input
                      id="live-api-url"
                      type="text"
                      value={liveApiUrl}
                      onChange={(e) => setLiveApiUrl(e.target.value)}
                      disabled={running}
                      className="flex-1 h-8 rounded-lg border border-amber-300 dark:border-amber-700 bg-background px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/40 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setLiveApiUrl(LIVE_API_URL)}
                      disabled={running || liveApiUrl === LIVE_API_URL}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-40 shrink-0"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="text-xs text-amber-600/70 dark:text-amber-500/70">
                    Clone{" "}
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      ai-travel-planner
                    </a>
                    , start the server, then click Plan Trip.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="px-6 py-6">
            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3.5 text-sm text-red-700 dark:text-red-400 mb-6">
                {error}
              </div>
            )}

            {/* Travel plan */}
            {plan && (
              <div className="space-y-5">
                <TripSummaryHeader plan={plan} weather={weather} currency={currency} />
                {plan.dayPlans.map((day) => (
                  <DayCard key={day.day} plan={day} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!running && !plan && !error && (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center text-muted-foreground">
                <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed">
                  <MapPin className="size-7 opacity-20" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="font-medium text-foreground">Plan your next trip</p>
                  <p className="text-sm">
                    Pick a prebuilt query above and click{" "}
                    <strong className="text-foreground">Plan Trip</strong> to watch
                    the LangGraph pipeline run and generate a day-by-day itinerary.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  {["Day-by-day itinerary", "Hotels & restaurants", "Live maps links", "Budget breakdown"].map((f) => (
                    <span
                      key={f}
                      className="flex items-center gap-1 rounded-full border px-3 py-1"
                    >
                      <ChevronRight className="size-3" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {running && !plan && (
              <div className="space-y-4 animate-pulse">
                <div className="rounded-2xl border p-6 space-y-3">
                  <div className="h-6 w-40 rounded bg-muted" />
                  <div className="h-4 w-64 rounded bg-muted" />
                  <div className="flex gap-3">
                    <div className="h-12 w-28 rounded-xl bg-muted" />
                    <div className="h-12 w-28 rounded-xl bg-muted" />
                    <div className="h-12 w-36 rounded-xl bg-muted" />
                  </div>
                </div>
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-2xl border overflow-hidden">
                    <div className="h-12 bg-muted/50 border-b" />
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-16 rounded-xl bg-muted" />
                        <div className="h-16 rounded-xl bg-muted" />
                        <div className="h-16 rounded-xl bg-muted" />
                        <div className="h-16 rounded-xl bg-muted" />
                      </div>
                      <div className="h-14 rounded-xl bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
