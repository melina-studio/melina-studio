import axios from 'axios';

const BaseURL = process.env.BACKEND_URL || 'http://localhost:8000';

export const getBoardData = async (boardId: string) => {
  try {
    const response = await axios.get(`${BaseURL}/api/v1/boards/${boardId}`);
    return response.data;
  } catch (error: any) {
    console.log(error, 'Error getting board data');
    throw new Error(error?.error || 'Error getting board data');
  }
};

export const saveBoardData = async (boardId: string, data: any) => {
  try {
    const response = await axios.post(`${BaseURL}/api/v1/boards/${boardId}/save`, data);
    return response.data;
  } catch (error: any) {
    console.log(error, 'Error saving board data');
    throw new Error(error?.error || 'Error saving board data');
  }
};
