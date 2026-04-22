export const getLeaveMotifs = async (axiosPrivate) => {
  const response = await axiosPrivate.get('/leaves/motifs');
  return response.data.data;
};

export const createLeaveRequest = async (
  axiosPrivate,
  { dateDebut, dateFin, codeM, motifCng }
) => {
  const payload = { dateDebut, dateFin, codeM };
  if (motifCng && motifCng.trim()) {
    payload.motifCng = motifCng.trim();
  }

  const response = await axiosPrivate.post('/leaves', payload);
  return response.data.data;
};

export const getMyLeaveRequests = async (
  axiosPrivate,
  { page = 0, size = 50 } = {}
) => {
  const response = await axiosPrivate.get('/leaves/my', {
    params: { page, size },
  });
  return response.data.data;
};

export const getLeaveValidationQueue = async (
  axiosPrivate,
  { status = 'I', page = 0, size = 50 } = {}
) => {
  const params = { page, size };
  if (status) params.status = status;

  const response = await axiosPrivate.get('/leaves/validation', { params });
  return response.data.data;
};

export const reviewLeaveRequest = async (
  axiosPrivate,
  { codSoc, matPers, numDcng, status }
) => {
  const response = await axiosPrivate.patch(
    `/leaves/validation/${codSoc}/${matPers}/${numDcng}/review`,
    { status }
  );
  return response.data.data;
};
