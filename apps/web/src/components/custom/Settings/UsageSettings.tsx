"use client";

import { useEffect, useState, useCallback } from "react";
import { SettingsSection } from "./SettingsSection";
import { BarChart3, Download, Loader2 } from "lucide-react";
import {
  getTokenAnalytics,
  type AnalyticsResponse,
  type HistoryRecord,
} from "@/service/analyticsService";
import { cn } from "@/lib/utils";

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

function formatCurrency(amount: number): string {
  return "$" + amount.toFixed(2);
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DateRange = 1 | 7 | 30;

export function UsageSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const [historyPage, setHistoryPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allHistory, setAllHistory] = useState<HistoryRecord[]>([]);

  const fetchAnalytics = useCallback(async (days: number, page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const data = await getTokenAnalytics(days, page, 20);
      setAnalytics(data);

      if (append) {
        setAllHistory(prev => [...prev, ...data.history.records]);
      } else {
        setAllHistory(data.history.records);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage data");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(dateRange);
    setHistoryPage(1);
  }, [dateRange, fetchAnalytics]);

  const loadMoreHistory = () => {
    const nextPage = historyPage + 1;
    setHistoryPage(nextPage);
    fetchAnalytics(dateRange, nextPage, true);
  };

  const exportCSV = () => {
    if (!allHistory.length) return;

    const headers = ["Date", "Model", "Provider", "Input", "Output", "Total", "Cost"];
    const rows = allHistory.map(record => [
      formatDateTime(record.created_at),
      record.model,
      record.provider,
      record.input_tokens,
      record.output_tokens,
      record.total_tokens,
      formatCurrency(record.cost),
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-${dateRange}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !analytics) {
    return (
      <SettingsSection title="Usage" description="Token consumption overview.">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </SettingsSection>
    );
  }

  if (error) {
    return (
      <SettingsSection title="Usage" description="Token consumption overview.">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart3 className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => fetchAnalytics(dateRange)}
            className="mt-3 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded cursor-pointer"
          >
            Retry
          </button>
        </div>
      </SettingsSection>
    );
  }

  if (!analytics) return null;

  return (
    <SettingsSection title="Usage" description="Token consumption overview.">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-muted rounded p-0.5">
          {([1, 7, 30] as DateRange[]).map((days) => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors cursor-pointer",
                dateRange === days
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {days}d
            </button>
          ))}
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-2 py-1 text-xs border border-border rounded hover:bg-muted transition-colors cursor-pointer"
        >
          <Download className="h-3 w-3" />
          Export
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded border border-border bg-card">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Tokens</div>
          <div className="text-lg font-semibold">{formatNumber(analytics.summary.total_tokens)}</div>
        </div>
        <div className="p-3 rounded border border-border bg-card">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Cost</div>
          <div className="text-lg font-semibold">{formatCurrency(analytics.summary.total_cost)}</div>
        </div>
        <div className="p-3 rounded border border-border bg-card">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Requests</div>
          <div className="text-lg font-semibold">{formatNumber(analytics.summary.total_requests)}</div>
        </div>
        <div className="p-3 rounded border border-border bg-card">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg/Req</div>
          <div className="text-lg font-semibold">
            {analytics.summary.total_requests > 0
              ? formatNumber(Math.round(analytics.summary.total_tokens / analytics.summary.total_requests))
              : "0"}
          </div>
        </div>
      </div>

      {/* Usage by model */}
      {analytics.usage_by_model.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">By Model</h3>
          <div className="space-y-1.5">
            {analytics.usage_by_model.map((model, index) => (
              <div
                key={`${model.model}-${model.provider ?? ""}-${index}`}
                className="flex items-center justify-between p-2 rounded border border-border bg-card"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <div>
                    <div className="text-xs font-medium">{model.model}</div>
                    <div className="text-[10px] text-muted-foreground">{model.provider}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <div className="text-muted-foreground text-[10px]">Tokens</div>
                    <div className="font-medium">{formatNumber(model.total_tokens)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground text-[10px]">Reqs</div>
                    <div className="font-medium">{model.request_count}</div>
                  </div>
                  <div className="text-right min-w-[50px]">
                    <div className="text-muted-foreground text-[10px]">Cost</div>
                    <div className="font-medium">{formatCurrency(model.cost)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">History</h3>
        {allHistory.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No usage history for this period.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-1.5 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 px-1.5 font-medium text-muted-foreground">Model</th>
                    <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">Tokens</th>
                    <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {allHistory.map((record, index) => (
                    <tr key={`${record.uuid}-${index}`} className="border-b border-border/50">
                      <td className="py-2 px-1.5 text-muted-foreground">
                        {formatDateTime(record.created_at)}
                      </td>
                      <td className="py-2 px-1.5">{record.model}</td>
                      <td className="py-2 px-1.5 text-right font-mono">
                        {formatNumber(record.total_tokens)}
                      </td>
                      <td className="py-2 px-1.5 text-right font-mono">
                        {formatCurrency(record.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {analytics.history.hasMore && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={loadMoreHistory}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </SettingsSection>
  );
}
