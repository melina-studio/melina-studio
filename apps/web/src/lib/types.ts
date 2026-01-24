import { Shape } from "@/lib/konavaTypes";

export type Board = {
  uuid: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  thumbnail: string; // Can be empty string or URL
};

export type SortOption = "recent" | "az" | "lastEdited";

export type UpdateBoardPayload = {
  title?: string;
  thumbnail?: string;
  starred?: boolean;
  saveThumbnail?: boolean;
};

export type ShapeSelection = {
  id: string;
  shapes: Shape[];
  image: {
    blob: Blob;
    dataURL: string;
    mimeType: string;
  };
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    padding: number;
  };
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type ChatImageAttachment = {
  id: string;
  file: File;
  previewUrl: string; // Object URL for preview
  uploadedUrl?: string; // GCP URL after upload
  status: "pending" | "uploading" | "uploaded" | "error";
};

export type TokenWarningPayload = {
  consumed_tokens: number;
  total_limit: number;
  percentage: number;
  reset_date: string;
};

export type TokenBlockedPayload = {
  consumed_tokens: number;
  total_limit: number;
  percentage: number;
  reset_date: string;
};