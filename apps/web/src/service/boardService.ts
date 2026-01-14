import axios from "axios";
import { BaseURL } from "@/lib/constants";
import { UpdateBoardPayload } from "@/lib/types";

export const createBoard = async (
  userId: string,
  title: string = "Untitled"
) => {
  try {
    const response = await axios.post(`${BaseURL}/api/v1/boards`, {
      userId: userId,
      title: title,
    });
    return response.data;
  } catch (error: any) {
    console.log(error, "Error creating board");
    throw new Error(error?.error || "Error creating board");
  }
};

export const getBoards = async () => {
  try {
    const response = await axios.get(`${BaseURL}/api/v1/boards`);
    return response.data;
  } catch (error: any) {
    console.log(error, "Error getting boards");
    throw new Error(error?.error || "Error getting boards");
  }
};

export const getBoardData = async (boardId: string) => {
  try {
    const response = await axios.get(`${BaseURL}/api/v1/boards/${boardId}`);
    return response.data;
  } catch (error: any) {
    console.log(error, "Error getting board data");
    throw new Error(error?.error || "Error getting board data");
  }
};

export const saveBoardData = async (boardId: string, data: any) => {
  try {
    const response = await axios.post(
      `${BaseURL}/api/v1/boards/${boardId}/save`,
      data
    );
    return response.data;
  } catch (error: any) {
    console.log(error, "Error saving board data");
    throw new Error(error?.error || "Error saving board data");
  }
};

export const clearBoardData = async (boardId: string) => {
  try {
    const response = await axios.delete(
      `${BaseURL}/api/v1/boards/${boardId}/clear`
    );
    return response.data;
  } catch (error: any) {
    console.log(error, "Error clearing board data");
    throw new Error(error?.error || "Error clearing board data");
  }
};

// Get starred boards for a user
export const getStarredBoards = async (userId: string) => {
  try {
    // TODO: Implement API call to fetch starred boards
    // const response = await axios.get(`${BaseURL}/api/v1/users/${userId}/starred-boards`);
    // return response.data;
    return { starredBoards: [] };
  } catch (error: any) {
    console.log(error, "Error getting starred boards");
    throw new Error(error?.error || "Error getting starred boards");
  }
};

// Toggle starred status for a board
export const toggleStarredBoard = async (userId: string, boardId: string) => {
  try {
    // TODO: Implement API call to toggle starred status
    // const response = await axios.post(`${BaseURL}/api/v1/users/${userId}/starred-boards/${boardId}/toggle`);
    // return response.data;
    return { success: true };
  } catch (error: any) {
    console.log(error, "Error toggling starred board");
    throw new Error(error?.error || "Error toggling starred board");
  }
};

// delete a board
export const deleteBoard = async (boardId: string) => {
  try {
    const response = await axios.delete(
      `${BaseURL}/api/v1/boards/${boardId}/delete`
    );
    return response.data;
  } catch (error: any) {
    console.log(error, "Error deleting board");
    throw new Error(error?.error || "Error deleting board");
  }
};

// update a board
export const updateBoard = async (
  boardId: string,
  payload: UpdateBoardPayload
) => {
  try {
    const response = await axios.put(
      `${BaseURL}/api/v1/boards/${boardId}/update`,
      payload
    );
    return response.data;
  } catch (error: any) {
    console.log(error, "Error updating board");
    throw new Error(error?.error || "Error updating board");
  }
};
