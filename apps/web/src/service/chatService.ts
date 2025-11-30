import axios from 'axios';
import { BaseURL } from '@/lib/constants';

export const getChatHistory = async (id: string) => {
  try {
    const response = await axios.get(`${BaseURL}/api/v1/chat/${id}`);
    return response.data;
  } catch (error: any) {
    console.log(error, 'Error getting chat history');
    throw new Error(error?.error || 'Error getting chat history');
  }
};

export const sendMessage = async (id: string, message: string) => {
  try {
    const response = await axios.post(`${BaseURL}/api/v1/chat/${id}`, { message: message });
    return response.data;
  } catch (error: any) {
    console.log(error, 'Error sending message');
    throw new Error(error?.error || 'Error sending message');
  }
};
