// Isolates UI-only employee creation simulation from page rendering logic.
export const submitEmployeeMock = async (payload) => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    success: true,
    matPers: payload.matPers,
  };
};
