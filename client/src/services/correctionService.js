export const requestCorrection = async (
  axiosPrivate,
  { attributCible, nouvelleValeur, pieceJointe }
) => {
  const formData = new FormData();
  formData.append('attributCible', attributCible);
  formData.append('nouvelleValeur', nouvelleValeur);
  formData.append('pieceJointe', pieceJointe);

  const response = await axiosPrivate.post('/corrections/request', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const getCorrectionRequests = async (
  axiosPrivate,
  { page = 0, size = 50, status = 'PENDING' } = {}
) => {
  const params = { page, size };
  if (status) params.status = status;

  const response = await axiosPrivate.get('/admin/corrections', { params });
  return response.data.data;
};

export const reviewCorrectionRequest = async (axiosPrivate, id, status) => {
  const response = await axiosPrivate.patch(`/admin/corrections/${id}/review`, { status });
  return response.data.data;
};

export const downloadCorrectionAttachment = async (axiosPrivate, id) => {
  const response = await axiosPrivate.get(`/admin/corrections/${id}/attachment`, {
    responseType: 'blob',
  });

  const contentDisposition = response.headers['content-disposition'] || '';
  const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  const fileName = fileNameMatch?.[1] || `demande-correction-${id}.bin`;

  return { blob: response.data, fileName };
};
