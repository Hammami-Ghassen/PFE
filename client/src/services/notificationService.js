export const getMyNotifications = async (axiosPrivate) => {
  const response = await axiosPrivate.get('/notifications/my');
  return response.data;
};

export const markAsRead = async (axiosPrivate, id) => {
  const response = await axiosPrivate.patch(`/notifications/${id}/read`);
  return response.data;
};
