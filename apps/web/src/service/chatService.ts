// import axios from "axios";
import axios from "@/lib/axios";
import { BaseURL } from "@/lib/constants";

export const getChatHistory = async (
  id: string,
  page: number = 1,
  pageSize: number = 20
) => {
  try {
    const response = await axios.get(
      `${BaseURL}/api/v1/chat/${id}?page=${page}&pageSize=${pageSize}`
    );
    return response.data;
  } catch (error: any) {
    console.log(error, "Error getting chat history");
    throw new Error(error?.error || "Error getting chat history");
  }
};

export const sendMessage = async (id: string, message: string) => {
  try {
    const response = await axios.post(`${BaseURL}/api/v1/chat/${id}`, {
      message: message,
    });
    return response.data;
  } catch (error: any) {
    console.log(error, "Error sending message");
    throw new Error(error?.error || "Error sending message");
  }
};

export const uploadChatImage = async (boardId: string, file: File): Promise<{ url: string }> => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await axios.post(`${BaseURL}/api/v1/chat/${boardId}/upload-image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error: any) {
    console.log(error, "Error uploading chat image");
    throw new Error(error?.error || "Error uploading chat image");
  }
};
