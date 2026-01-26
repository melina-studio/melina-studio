import axios from "@/lib/axios";
import { BaseURL } from "@/lib/constants";

export type DailyUsage = {
  date: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  request_count: number;
};

export type UsageByModel = {
  model: string;
  provider: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  request_count: number;
  cost: number;
};

export type HistoryRecord = {
  uuid: string;
  provider: string;
  model: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  created_at: string;
  board_uuid?: string;
};

export type AnalyticsResponse = {
  summary: {
    total_tokens: number;
    total_requests: number;
    total_cost: number;
    days: number;
  };
  daily_usage: DailyUsage[];
  usage_by_model: UsageByModel[];
  history: {
    records: HistoryRecord[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
};

export const getTokenAnalytics = async (
  days: number = 30,
  page: number = 1,
  pageSize: number = 20
): Promise<AnalyticsResponse> => {
  try {
    const response = await axios.get(
      `${BaseURL}/api/v1/tokens/analytics?days=${days}&page=${page}&pageSize=${pageSize}`
    );
    return response.data;
  } catch (error: any) {
    console.log(error, "Error getting token analytics");
    throw new Error(error?.error || "Error getting token analytics");
  }
};
