import { isLeaveAttachmentRequired } from './leaveRequestRules';

describe('isLeaveAttachmentRequired', () => {
  it('requires attachments for motifs configured by backend metadata', () => {
    expect(isLeaveAttachmentRequired({ requiresAttachment: true }, '02', 1)).toBe(true);
  });

  it('requires attachments for paternity requests longer than seven days', () => {
    expect(isLeaveAttachmentRequired({ requiresAttachment: false }, '12', 8)).toBe(true);
  });

  it('keeps seven-day paternity requests attachment-optional', () => {
    expect(isLeaveAttachmentRequired({ requiresAttachment: false }, '12', 7)).toBe(false);
  });
});
