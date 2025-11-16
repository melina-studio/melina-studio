import React from 'react';
import axios from 'axios';

export const useApi = (url: string) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [data, setData] = React.useState(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(url);
      setData(response.data);
    } catch (error: any) {
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [url]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { loading, error, data };
};
