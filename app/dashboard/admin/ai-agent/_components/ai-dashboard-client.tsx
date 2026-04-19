"use client";

import { useState } from "react";
import type { AiDashboardStats, AiCallLogRow, AiPipelineOrder, SalesRepOption } from "../actions";
import { retryAiCall, cancelAiCalls, assignToHuman } from "../actions";
import type { AiCallOutcome, AiCallStatus } from "@prisma/client";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Outcome / Status styling
// ---------------------------------------------------------------------------

const OUTCOME_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ANSWERED: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-800 dark:text-green-200", label: "Answered" },
  NO_ANSWER: { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-800 dark:text-yellow-200", label: "No Answer" },
  BUSY: { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-800 dark:text-orange-200", label: "Busy" },
  FAILED: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-800 dark:text-red-200", label: "Failed" },
  VOICEMAIL: { bg: "bg-purple-100 dark:bg-purple-950", text: "text-purple-800 dark:text-purple-200", label: "Voicemail" },
};

const AI_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-800 dark:text-blue-200", label: "Pending" },
  IN_PROGRESS: { bg: "bg-indigo-100 dark:bg-indigo-950", text: "text-indigo-800 dark:text-indigo-200", label: "In Progress" },
  REACHED: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-800 dark:text-green-200", label: "Reached" },
  UNREACHABLE: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-800 dark:text-red-200", label: "Unreachable" },
  COMPLETED: { bg: "bg-gray-100 dark:bg-gray-950", text: "text-gray-800 dark:text-gray-200", label: "Completed" },
};

function OutcomeBadge({ outcome }: { outcome: AiCallOutcome | null }) {
  if (!outcome) return <span className="text-xs text-muted-foreground">—</span>;
  const style = OUTCOME_STYLES[outcome] ?? OUTCOME_STYLES.FAILED;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function AiStatusBadge({ status }: { status: AiCallStatus | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const style = AI_STATUS_STYLES[status] ?? AI_STATUS_STYLES.PENDING;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function formatDuration(secs: number | null) {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function timeAgo(date: Date) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AiDashboardClientProps {
  stats: AiDashboardStats;
  recentCalls: AiCallLogRow[];
  pipelineOrders: AiPipelineOrder[];
  salesReps: SalesRepOption[];
}

export function AiDashboardClient({ stats, recentCalls, pipelineOrders, salesReps }: AiDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "calls">("pipeline");
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleRetry(orderId: string) {
    setActionLoading(orderId);
    setError("");
    const result = await retryAiCall(orderId);
    if (!result.success) setError(result.error);
    setActionLoading(null);
  }

  async function handleCancel(orderId: string) {
    if (!confirm("Remove this order from the AI call pipeline?")) return;
    setActionLoading(orderId);
    setError("");
    const result = await cancelAiCalls(orderId);
    if (!result.success) setError(result.error);
    setActionLoading(null);
  }

  async function handleAssign(orderId: string, salesRepId: string) {
    setActionLoading(orderId);
    setError("");
    setSuccessMsg("");
    const result = await assignToHuman(orderId, salesRepId);
    if (result.success) {
      setSuccessMsg(`Order assigned to ${result.repName}`);
      setAssigningOrderId(null);
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setError(result.error);
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Phone className="size-5 text-blue-600" />}
          label="Total Calls"
          value={stats.totalCallsMade}
          bg="bg-blue-50 dark:bg-blue-950/30"
        />
        <StatCard
          icon={<PhoneIncoming className="size-5 text-green-600" />}
          label="Answered"
          value={stats.answeredCalls}
          sub={`${stats.answerRate}% rate`}
          bg="bg-green-50 dark:bg-green-950/30"
        />
        <StatCard
          icon={<Clock className="size-5 text-purple-600" />}
          label="Avg Duration"
          value={formatDuration(stats.avgDurationSecs)}
          bg="bg-purple-50 dark:bg-purple-950/30"
        />
        <StatCard
          icon={<Users className="size-5 text-indigo-600" />}
          label="In Pipeline"
          value={stats.ordersInPipeline}
          bg="bg-indigo-50 dark:bg-indigo-950/30"
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
          label="Reached"
          value={stats.ordersReached}
          bg="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <StatCard
          icon={<AlertTriangle className="size-5 text-orange-600" />}
          label="Unreachable"
          value={stats.ordersUnreachable}
          bg="bg-orange-50 dark:bg-orange-950/30"
        />
        <StatCard
          icon={<CheckCircle2 className="size-5 text-gray-600" />}
          label="Completed"
          value={stats.ordersCompleted}
          bg="bg-gray-50 dark:bg-gray-950/30"
        />
      </div>

      {/* Outcome breakdown */}
      {stats.outcomeBreakdown.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Call Outcomes</h3>
          <div className="flex flex-wrap gap-3">
            {stats.outcomeBreakdown.map(({ outcome, count }) => {
              const style = OUTCOME_STYLES[outcome] ?? OUTCOME_STYLES.FAILED;
              return (
                <div key={outcome} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${style.bg}`}>
                  <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
                  <span className={`text-lg font-bold ${style.text}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Success banner */}
      {successMsg && (
        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md text-green-800 dark:text-green-200 text-sm">
          {successMsg}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "pipeline"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pipeline ({pipelineOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("calls")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "calls"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Call Logs ({recentCalls.length})
        </button>
      </div>

      {/* Pipeline Orders Table */}
      {activeTab === "pipeline" && (
        <div className="rounded-lg border border-border overflow-hidden">
          {pipelineOrders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No orders in the AI pipeline right now.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">AI Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Attempts</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Call</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Next Call</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pipelineOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{order.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{order.customerName}</span>
                          <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <AiStatusBadge status={order.aiCallStatus} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.aiCallAttempts}/{5} (cycle {order.aiCycleNumber})
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <OutcomeBadge outcome={order.lastCallOutcome} />
                          {order.lastCallAt && (
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(order.lastCallAt)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {order.aiNextCallAt
                          ? new Date(order.aiNextCallAt) <= new Date()
                            ? "Due now"
                            : timeAgo(order.aiNextCallAt).replace("ago", "").trim()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => handleRetry(order.id)}
                            disabled={actionLoading === order.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 rounded disabled:opacity-50"
                            title="Retry call"
                          >
                            <RotateCcw className="size-3" />
                            Retry
                          </button>
                          <button
                            onClick={() => setAssigningOrderId(
                              assigningOrderId === order.id ? null : order.id,
                            )}
                            disabled={actionLoading === order.id || salesReps.length === 0}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 rounded disabled:opacity-50"
                            title="Assign to human sales rep"
                          >
                            <UserPlus className="size-3" />
                            Assign
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={actionLoading === order.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded disabled:opacity-50"
                            title="Remove from pipeline"
                          >
                            <XCircle className="size-3" />
                            Cancel
                          </button>
                        </div>
                        {/* Assign dropdown */}
                        {assigningOrderId === order.id && (
                          <div className="mt-2 p-2 bg-background border border-border rounded-lg shadow-lg text-left">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Assign to sales rep:
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {salesReps.map((rep) => (
                                <button
                                  key={rep.id}
                                  onClick={() => handleAssign(order.id, rep.id)}
                                  disabled={actionLoading === order.id}
                                  className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                  {rep.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Call Logs Table */}
      {activeTab === "calls" && (
        <div className="rounded-lg border border-border overflow-hidden">
          {recentCalls.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No AI calls recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Attempt</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Outcome</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">When</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Transcript</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{call.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{call.customerName}</span>
                          <p className="text-xs text-muted-foreground">{call.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        #{call.attemptNumber} (c{call.cycleNumber})
                      </td>
                      <td className="px-4 py-3">
                        <OutcomeBadge outcome={call.outcome} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDuration(call.durationSecs)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {timeAgo(call.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {call.transcript ? (
                          <button
                            onClick={() =>
                              setExpandedTranscript(
                                expandedTranscript === call.id ? null : call.id,
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {expandedTranscript === call.id ? (
                              <>Hide <ChevronUp className="size-3" /></>
                            ) : (
                              <>View <ChevronDown className="size-3" /></>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Expanded transcript rows */}
                  {recentCalls.map(
                    (call) =>
                      expandedTranscript === call.id &&
                      call.transcript && (
                        <tr key={`${call.id}-transcript`}>
                          <td colSpan={7} className="px-4 py-3 bg-muted/30">
                            <div className="max-h-64 overflow-y-auto">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Transcript — Order #{call.orderNumber}, Attempt #{call.attemptNumber}
                              </p>
                              <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/80 leading-relaxed">
                                {call.transcript}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  bg: string;
}) {
  return (
    <div className={`rounded-lg p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
