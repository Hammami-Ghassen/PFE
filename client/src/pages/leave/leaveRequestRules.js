export const isLeaveAttachmentRequired = (motif, codeM, requestedBusinessDays) => (
  Boolean(motif?.requiresAttachment) || (codeM === '12' && requestedBusinessDays > 7)
);
