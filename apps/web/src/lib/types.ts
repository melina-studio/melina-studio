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
