"use client";

import { useEffect, useState, useCallback } from "react";
import { SettingsSection } from "./SettingsSection";
import { LineChart, Loader2 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";
import { getTokenAnalytics, type AnalyticsResponse } from "@/service/analyticsService";
import { cn } from "@/lib/utils";

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const tokenChartConfig = {
  input_tokens: {
    label: "Input",
    color: "hsl(142, 76%, 46%)",
  },
  output_tokens: {
    label: "Output",
    color: "hsl(142, 50%, 26%)",
  },
} satisfies ChartConfig;

const requestChartConfig = {
  request_count: {
    label: "Requests",
    color: "hsl(220, 70%, 50%)",
  },
} satisfies ChartConfig;

type DateRange = 1 | 7 | 30;

export function AnalyticsSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(30);

  const fetchAnalytics = useCallback(async (days: number) => {
    try {
      setLoading(true);
      const data = await getTokenAnalytics(days, 1, 1);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(dateRange);
  }, [dateRange, fetchAnalytics]);

  if (loading && !analytics) {
    return (
      <SettingsSection title="Analytics" description="Visual insights into your usage.">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </SettingsSection>
    );
  }

  if (error) {
    return (
      <SettingsSection title="Analytics" description="Visual insights into your usage.">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <LineChart className="h-6 w-6 text-muted-foreground mb-2" />
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

  const chartData = (analytics.daily_usage ?? []).map(day => ({
    date: formatDate(day.date),
    input_tokens: day.input_tokens ?? 0,
    output_tokens: day.output_tokens ?? 0,
    total_tokens: day.total_tokens ?? 0,
    request_count: day.request_count ?? 0,
  }));

  const hasData = chartData.length > 0 && chartData.some(d => d.total_tokens > 0);

  return (
    <SettingsSection title="Analytics" description="Visual insights into your usage.">
      {/* Date range selector */}
      <div className="flex items-center">
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
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <LineChart className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No data for this period.</p>
        </div>
      ) : (
        <>
          {/* Token usage chart */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Daily Tokens</h3>
            <ChartContainer config={tokenChartConfig} className="h-[200px] w-full">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatNumber(value)}
                  width={45}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="input_tokens"
                  fill="var(--color-input_tokens)"
                  radius={[3, 3, 0, 0]}
                  stackId="tokens"
                />
                <Bar
                  dataKey="output_tokens"
                  fill="var(--color-output_tokens)"
                  radius={[3, 3, 0, 0]}
                  stackId="tokens"
                />
              </ComposedChart>
            </ChartContainer>
          </div>

          {/* Requests chart */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Daily Requests</h3>
            <ChartContainer config={requestChartConfig} className="h-[150px] w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                />
                <defs>
                  <linearGradient id="requestGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-request_count)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-request_count)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="request_count"
                  stroke="var(--color-request_count)"
                  strokeWidth={1.5}
                  fill="url(#requestGradient)"
                />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2 rounded border border-border bg-card text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Peak Day</div>
              <div className="text-sm font-semibold">
                {formatNumber(Math.max(...chartData.map(d => d.total_tokens)))}
              </div>
            </div>
            <div className="p-2 rounded border border-border bg-card text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Avg/Day</div>
              <div className="text-sm font-semibold">
                {formatNumber(Math.round(chartData.reduce((sum, d) => sum + d.total_tokens, 0) / chartData.length))}
              </div>
            </div>
            <div className="p-2 rounded border border-border bg-card text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Active Days</div>
              <div className="text-sm font-semibold">
                {chartData.filter(d => d.total_tokens > 0).length}
              </div>
            </div>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
