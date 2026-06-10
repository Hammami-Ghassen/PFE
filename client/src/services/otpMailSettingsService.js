export const getOtpMailSettings = async (axiosPrivate) => {
  const response = await axiosPrivate.get('/admin/otp-mail-settings');
  return response.data.data;
};

export const updateOtpMailSettings = async (axiosPrivate, settings) => {
  const response = await axiosPrivate.put('/admin/otp-mail-settings', settings);
  return response.data.data;
};

export const sendOtpMailTest = async (axiosPrivate, payload) => {
  const response = await axiosPrivate.post('/admin/otp-mail-settings/test', payload);
  return response.data;
};
