export const getNews = async (axiosPrivate) => {
  const response = await axiosPrivate.get('/news');
  return response.data;
};
