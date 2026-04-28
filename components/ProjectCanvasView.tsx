"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/format";

// ── Types ──────────────────────────────────────────────────────────────────

type ActivityNode = {
  id: string;
  note: string;
  activityDate: Date | string;
  emailMessageId: string | null;
  emailParentId: string | null;
  aiAnalysis: unknown;
  user: { name: string } | null;
};

type ActivityTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  sourceActivityId: string | null;
  assignedTo: { name: string } | null;
};

type ParsedAnalysis = { summary: string };

function parseAnalysis(value: unknown): ParsedAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const summary = typeof v.summary === "string" ? v.summary.trim() : "";
  return summary ? { summary } : null;
}

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

// ── Constants ──────────────────────────────────────────────────────────────

const MOCK_USERS = ["Unassigned", "Alice Chen", "Bob Miller", "Carol White", "David Kim", "Eva Novak"];

const PHASE_CONFIG: Record<string, { bg: string; border: string; text: string }> = {
  DISCOVERY: { bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.28)", text: "rgba(129,140,248,0.85)" },
  VALIDATION: { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.28)", text: "rgba(74,222,128,0.85)" },
  MVP: { bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.28)", text: "rgba(252,211,77,0.85)" },
  SCALING: { bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.28)", text: "rgba(251,146,60,0.85)" },
  SPIN_OFF: { bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.28)", text: "rgba(196,130,250,0.85)" },
};

const CARD_W = 280;
const CARD_H_ACTIVITY = 160;
const CARD_H_TASK = 130;
const H_GAP = 340;
const V_GAP = 200;

// ── Layout ─────────────────────────────────────────────────────────────────

function buildAutoLayout(
  activities: ActivityNode[],
  tasks: ActivityTask[],
): Map<string, { x: number; y: number }> {
  const sorted = [...activities].sort(
    (a, b) => toDate(a.activityDate).getTime() - toDate(b.activityDate).getTime(),
  );

  const byMsgId = new Map<string, ActivityNode>();
  sorted.forEach(a => { if (a.emailMessageId) byMsgId.set(a.emailMessageId, a); });

  const childrenOf = new Map<string, ActivityNode[]>();
  const roots: ActivityNode[] = [];
  sorted.forEach(a => {
    const parent = a.emailParentId ? byMsgId.get(a.emailParentId) : null;
    if (!parent) { roots.push(a); return; }
    const siblings = childrenOf.get(parent.id) ?? [];
    siblings.push(a);
    childrenOf.set(parent.id, siblings);
  });

  const positions = new Map<string, { x: number; y: number }>();
  let yCounter = 80;

  function place(node: ActivityNode, depth: number) {
    const x = 80 + depth * H_GAP;
    const y = yCounter;
    positions.set(node.id, { x, y });
    yCounter += V_GAP;

    const linked = tasks.filter(t => t.sourceActivityId === node.id);
    linked.forEach((task, i) => {
      positions.set(task.id, { x: x + CARD_W + 56, y: y + i * (CARD_H_TASK + 16) });
    });
    if (linked.length > 0) yCounter = Math.max(yCounter, y + linked.length * (CARD_H_TASK + 16) + 16);

    const children = (childrenOf.get(node.id) ?? []).sort(
      (a, b) => toDate(a.activityDate).getTime() - toDate(b.activityDate).getTime(),
    );
    children.forEach(child => place(child, depth + 1));
  }

  roots.forEach(root => place(root, 0));

  tasks
    .filter(t => !t.sourceActivityId)
    .forEach(task => {
      positions.set(task.id, { x: 80, y: yCounter });
      yCounter += V_GAP;
    });

  return positions;
}

// ── Component ──────────────────────────────────────────────────────────────

type Props = {
  projectId: string;
  projectStage: string;
  activities: ActivityNode[];
  tasks: ActivityTask[];
};

export function ProjectCanvasView({ projectId, projectStage, activities, tasks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const storageKey = `iep-canvas-${projectId}`;

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(() => new Map());
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Map<string, string>>(() => new Map());

  const dragRef = useRef<{
    kind: "pan" | "node";
    nodeId?: string;
    startMX: number;
    startMY: number;
    startTX: number;
    startTY: number;
    startNX: number;
    startNY: number;
  } | null>(null);

  // Load positions from localStorage on mount
  useEffect(() => {
    let saved: Map<string, { x: number; y: number }> | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, { x: number; y: number }>;
        if (obj && typeof obj === "object") {
          saved = new Map(Object.entries(obj));
        }
      }
    } catch {
      // ignore
    }
    setPositions(saved ?? buildAutoLayout(activities, tasks));
    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist positions to localStorage
  useEffect(() => {
    if (!ready) return;
    const obj: Record<string, { x: number; y: number }> = {};
    positions.forEach((v, k) => { obj[k] = v; });
    try { localStorage.setItem(storageKey, JSON.stringify(obj)); } catch { /* ignore */ }
  }, [positions, ready, storageKey]);

  // Canvas pan mouse down
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragRef.current = {
        kind: "pan",
        startMX: e.clientX,
        startMY: e.clientY,
        startTX: transform.x,
        startTY: transform.y,
        startNX: 0,
        startNY: 0,
      };
    },
    [transform.x, transform.y],
  );

  // Node drag mouse down
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const pos = positions.get(nodeId) ?? { x: 0, y: 0 };
      dragRef.current = {
        kind: "node",
        nodeId,
        startMX: e.clientX,
        startMY: e.clientY,
        startTX: transform.x,
        startTY: transform.y,
        startNX: pos.x,
        startNY: pos.y,
      };
      setSelectedId(nodeId);
    },
    [positions, transform.x, transform.y],
  );

  // Global mouse move / up
  useEffect(() => {
    const currentScale = transform.scale;

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startMX;
      const dy = e.clientY - d.startMY;
      if (d.kind === "pan") {
        setTransform(prev => ({ ...prev, x: d.startTX + dx, y: d.startTY + dy }));
      } else if (d.kind === "node" && d.nodeId) {
        const id = d.nodeId;
        setPositions(prev => {
          const next = new Map(prev);
          next.set(id, { x: d.startNX + dx / currentScale, y: d.startNY + dy / currentScale });
          return next;
        });
      }
    };

    const onUp = () => { dragRef.current = null; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [transform.scale]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform(prev => {
        const newScale = Math.min(Math.max(prev.scale * factor, 0.15), 3);
        const ratio = newScale / prev.scale;
        return { scale: newScale, x: mx - ratio * (mx - prev.x), y: my - ratio * (my - prev.y) };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────

  const taskIds = new Set(tasks.map(t => t.id));

  const byMsgId = new Map<string, string>();
  activities.forEach(a => { if (a.emailMessageId) byMsgId.set(a.emailMessageId, a.id); });

  type EdgeData = { id: string; srcId: string; tgtId: string; kind: "email" | "task"; status?: string };
  const edges: EdgeData[] = [];

  activities.forEach(a => {
    if (a.emailParentId) {
      const parentId = byMsgId.get(a.emailParentId);
      if (parentId) edges.push({ id: `e-${parentId}-${a.id}`, srcId: parentId, tgtId: a.id, kind: "email" });
    }
  });
  tasks.forEach(t => {
    if (t.sourceActivityId) {
      edges.push({ id: `t-${t.sourceActivityId}-${t.id}`, srcId: t.sourceActivityId, tgtId: t.id, kind: "task", status: t.status });
    }
  });

  function nodeCenter(id: string): { x: number; y: number } | null {
    const pos = positions.get(id);
    if (!pos) return null;
    const isTask = taskIds.has(id);
    return { x: pos.x + CARD_W / 2, y: pos.y + (isTask ? CARD_H_TASK : CARD_H_ACTIVITY) / 2 };
  }

  const phase = PHASE_CONFIG[projectStage] ?? PHASE_CONFIG.DISCOVERY;

  // Phase zone extents
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  positions.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + CARD_W);
    maxY = Math.max(maxY, p.y + Math.max(CARD_H_ACTIVITY, CARD_H_TASK));
  });
  const zoneX = (isFinite(minX) ? minX : 0) - 44;
  const zoneY = (isFinite(minY) ? minY : 0) - 44;
  const zoneW = (isFinite(maxX) ? maxX - zoneX : 400) + 44;
  const zoneH = (isFinite(maxY) ? maxY - zoneY : 400) + 44;
  const svgW = Math.max(isFinite(maxX) ? maxX + 220 : 1200, 1200);
  const svgH = Math.max(isFinite(maxY) ? maxY + 220 : 800, 800);

  // ── Empty state ────────────────────────────────────────────────────────

  if (!activities.length && !tasks.length) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          background: "#0d0d14",
          borderRadius: 12,
          color: "rgba(113,113,122,0.55)",
          fontFamily: "monospace",
          fontSize: 13,
          letterSpacing: "0.05em",
        }}
      >
        No communication records to map yet.
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      style={{
        position: "relative",
        width: "100%",
        height: "72vh",
        background: "#0d0d14",
        backgroundImage:
          "linear-gradient(rgba(99,102,241,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.07) 1px,transparent 1px)",
        backgroundSize: "40px 40px",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {/* Infinite canvas layer */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "0 0",
          transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`,
          willChange: "transform",
        }}
      >
        {/* Phase zone */}
        {ready && (
          <div
            style={{
              position: "absolute",
              left: zoneX,
              top: zoneY,
              width: zoneW,
              height: zoneH,
              borderRadius: 20,
              background: phase.bg,
              border: `1px dashed ${phase.border}`,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 14,
                left: 18,
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: phase.text,
              }}
            >
              {projectStage.replace(/_/g, " ")} PHASE
            </span>
          </div>
        )}

        {/* SVG connections */}
        <svg
          width={svgW}
          height={svgH}
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "none" }}
        >
          <defs>
            <style>{`
              @keyframes iep-pulse {
                0%,100% { stroke-opacity: 0.9; }
                50% { stroke-opacity: 0.18; }
              }
              .iep-critical { animation: iep-pulse 2s ease-in-out infinite; }
            `}</style>
            <marker id="iep-arrow-gray" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,1 L0,6 L7,3.5 z" fill="rgba(113,113,122,0.5)" />
            </marker>
            <marker id="iep-arrow-red" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,1 L0,6 L7,3.5 z" fill="#ef4444" />
            </marker>
            <marker id="iep-arrow-green" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,1 L0,6 L7,3.5 z" fill="#22c55e" />
            </marker>
          </defs>

          {edges.map(edge => {
            const src = nodeCenter(edge.srcId);
            const tgt = nodeCenter(edge.tgtId);
            if (!src || !tgt) return null;
            const isDone = edge.status === "DONE" || edge.status === "CANCELLED";
            const isTask = edge.kind === "task";
            const stroke = isTask ? (isDone ? "#22c55e" : "#ef4444") : "rgba(113,113,122,0.4)";
            const markerId = isTask ? (isDone ? "iep-arrow-green" : "iep-arrow-red") : "iep-arrow-gray";
            const cx = (src.x + tgt.x) / 2;
            return (
              <path
                key={edge.id}
                d={`M${src.x},${src.y} C${cx},${src.y} ${cx},${tgt.y} ${tgt.x},${tgt.y}`}
                fill="none"
                stroke={stroke}
                strokeWidth={isTask && !isDone ? 2 : 1.5}
                markerEnd={`url(#${markerId})`}
                className={isTask && !isDone ? "iep-critical" : undefined}
              />
            );
          })}
        </svg>

        {/* Activity cards */}
        {ready &&
          activities.map(activity => {
            const pos = positions.get(activity.id);
            if (!pos) return null;
            const analysis = parseAnalysis(activity.aiAnalysis);
            const isSelected = selectedId === activity.id;
            return (
              <div
                key={activity.id}
                onMouseDown={e => handleNodeMouseDown(e, activity.id)}
                style={{ position: "absolute", left: pos.x, top: pos.y, width: CARD_W, cursor: "grab" }}
              >
                <div
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${isSelected ? "rgba(99,102,241,0.75)" : "rgba(99,102,241,0.22)"}`,
                    background: "rgba(13,13,22,0.97)",
                    backdropFilter: "blur(12px)",
                    boxShadow: isSelected
                      ? "0 0 0 2px rgba(99,102,241,0.28),0 8px 32px rgba(0,0,0,0.6)"
                      : "0 4px 20px rgba(0,0,0,0.5)",
                    padding: "12px 14px",
                    minHeight: CARD_H_ACTIVITY,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 9,
                        color: "rgba(129,140,248,0.8)",
                        letterSpacing: "0.13em",
                        textTransform: "uppercase",
                      }}
                    >
                      ✉ email
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(113,113,122,0.6)" }}>
                      {formatDate(activity.activityDate)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#d4d4d8",
                      lineHeight: 1.55,
                      margin: 0,
                      overflow: "hidden",
                      maxHeight: "4.65em",
                    }}
                  >
                    {activity.note}
                  </p>
                  {analysis && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(99,102,241,0.12)" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 8,
                          color: "rgba(129,140,248,0.6)",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        ⬡ ai summary
                      </span>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(165,180,252,0.8)",
                          margin: "4px 0 0",
                          lineHeight: 1.45,
                          overflow: "hidden",
                          maxHeight: "2.9em",
                        }}
                      >
                        {analysis.summary}
                      </p>
                    </div>
                  )}
                  <p style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(113,113,122,0.5)", marginTop: 8 }}>
                    {activity.user?.name ?? "Unknown"}
                  </p>
                </div>
              </div>
            );
          })}

        {/* Task cards */}
        {ready &&
          tasks.map(task => {
            const pos = positions.get(task.id);
            if (!pos) return null;
            const isSelected = selectedId === task.id;
            const statusColor =
              task.status === "DONE"
                ? "#22c55e"
                : task.status === "IN_PROGRESS"
                  ? "#f59e0b"
                  : task.status === "CANCELLED"
                    ? "#71717a"
                    : "#ef4444";
            const assigned = assignments.get(task.id) ?? task.assignedTo?.name ?? "Unassigned";
            return (
              <div
                key={task.id}
                onMouseDown={e => handleNodeMouseDown(e, task.id)}
                style={{ position: "absolute", left: pos.x, top: pos.y, width: CARD_W, cursor: "grab" }}
              >
                <div
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${isSelected ? `${statusColor}bb` : `${statusColor}33`}`,
                    background: "rgba(10,10,18,0.97)",
                    backdropFilter: "blur(12px)",
                    boxShadow: isSelected
                      ? `0 0 0 2px ${statusColor}44,0 8px 32px rgba(0,0,0,0.6)`
                      : "0 4px 20px rgba(0,0,0,0.5)",
                    padding: "12px 14px",
                    minHeight: CARD_H_TASK,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 9,
                        color: statusColor,
                        letterSpacing: "0.13em",
                        textTransform: "uppercase",
                      }}
                    >
                      ◈ {task.status.replace(/_/g, " ")}
                    </span>
                    {task.dueDate && (
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(113,113,122,0.5)" }}>
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#e4e4e7", margin: "0 0 4px", lineHeight: 1.4 }}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(161,161,170,0.65)",
                        margin: "0 0 8px",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        maxHeight: "2.8em",
                      }}
                    >
                      {task.description}
                    </p>
                  )}
                  {/* Team assignment select */}
                  <div onMouseDown={e => e.stopPropagation()}>
                    <select
                      value={assigned}
                      onChange={e => setAssignments(prev => new Map(prev).set(task.id, e.target.value))}
                      style={{
                        width: "100%",
                        background: "rgba(20,20,32,0.95)",
                        border: "1px solid rgba(99,102,241,0.18)",
                        borderRadius: 6,
                        color: "#a1a1aa",
                        fontSize: 11,
                        fontFamily: "monospace",
                        padding: "3px 8px",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      {MOCK_USERS.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* HUD — top left: phase + counts */}
      <div style={{ position: "absolute", top: 14, left: 14, zIndex: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            color: phase.text,
            background: "rgba(10,10,18,0.85)",
            border: `1px solid ${phase.border}`,
            borderRadius: 6,
            padding: "3px 10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {projectStage.replace(/_/g, " ")}
        </span>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            color: "rgba(113,113,122,0.6)",
            background: "rgba(10,10,18,0.75)",
            borderRadius: 6,
            padding: "3px 8px",
          }}
        >
          {activities.length} msgs · {tasks.length} tasks
        </span>
      </div>

      {/* HUD — bottom right: zoom controls */}
      <div style={{ position: "absolute", bottom: 14, right: 14, zIndex: 20, display: "flex", gap: 6 }}>
        {(
          [
            { label: "+", title: "Zoom in", action: () => setTransform(p => ({ ...p, scale: Math.min(p.scale * 1.2, 3) })) },
            { label: "⌖", title: "Reset view", action: () => setTransform({ x: 0, y: 0, scale: 1 }) },
            { label: "−", title: "Zoom out", action: () => setTransform(p => ({ ...p, scale: Math.max(p.scale * 0.83, 0.15) })) },
            {
              label: "↺",
              title: "Reset layout",
              action: () => {
                setPositions(buildAutoLayout(activities, tasks));
                setTransform({ x: 0, y: 0, scale: 1 });
                try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
              },
            },
          ] as { label: string; title: string; action: () => void }[]
        ).map(btn => (
          <button
            key={btn.label}
            title={btn.title}
            onClick={btn.action}
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: 32,
              height: 32,
              background: "rgba(13,13,22,0.9)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 8,
              color: "#a1a1aa",
              fontSize: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* HUD — bottom left: zoom level */}
      <div style={{ position: "absolute", bottom: 18, left: 14, zIndex: 20 }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(113,113,122,0.45)" }}>
          {Math.round(transform.scale * 100)}%
        </span>
      </div>
    </div>
  );
}
