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

const decodeHeaderValue = (value) => {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getAttachmentFileName = (response, id) => {
  const directFileName = response.headers?.['x-attachment-filename'];
  if (directFileName) {
    return directFileName;
  }

  const contentDisposition = response.headers?.['content-disposition'] || '';
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeHeaderValue(utf8Match[1].replace(/^"|"$/g, ''));
  }

  const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (fileNameMatch?.[1]) {
    return fileNameMatch[1];
  }

  return `demande-correction-${id}`;
};

export const downloadCorrectionAttachment = async (axiosPrivate, id) => {
  const response = await axiosPrivate.get(`/admin/corrections/${id}/attachment`, {
    responseType: 'blob',
  });

  const fileName = getAttachmentFileName(response, id);
  const blob = new Blob([response.data], {
    type: response.headers?.['content-type'] || 'application/octet-stream',
  });

  return { blob, fileName };
};
