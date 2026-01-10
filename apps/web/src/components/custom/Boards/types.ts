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
