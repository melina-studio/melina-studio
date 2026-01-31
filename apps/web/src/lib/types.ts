import { Shape } from "@/lib/konavaTypes";

export type Board = {
  uuid: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  thumbnail: string; // Can be empty string or URL
  starred: boolean;
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

export type ShapeRendererProps = {
  shape: Shape;
  activeTool: string;
  isDraggingShape: boolean;
  isDraggingStage: boolean;
  cursor: string;
  isDarkMode: boolean;
  isSelected?: boolean;
  onShapeClick: (e: any, id: string) => void;
  onShapeDragStart: (e: any, id: string) => void;
  onShapeDragEnd: (e: any, id: string) => void;
  onShapeDragMove: (e: any, id: string) => void;
  onRectTransform: (node: any, id: string) => void;
  onEllipseTransform: (node: any, id: string) => void;
  onImageTransform: (node: any, id: string) => void;
  onTextDoubleClick: (id: string, pos: { x: number; y: number }) => void;
  onColorClick: (e: any, id: string) => void;
  onArrowControlPointDrag?: (
    pointType: "start" | "end" | "bend",
    newPos: { x: number; y: number }
  ) => void;
  onArrowControlPointDragEnd?: () => void;
  setStageCursor: (c: string) => void;
  setIsDraggingStage: (dragging: boolean) => void;
};
