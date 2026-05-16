import { createLeaveRequest } from './leaveService';

describe('createLeaveRequest', () => {
  it('posts JSON when no attachment is provided', async () => {
    const axiosPrivate = {
      post: jest.fn().mockResolvedValue({ data: { data: { numDcng: 1 } } }),
    };

    await createLeaveRequest(axiosPrivate, {
      dateDebut: '2026-01-05',
      dateFin: '2026-01-05',
      codeM: '01',
      motifCng: '  test  ',
    });

    expect(axiosPrivate.post).toHaveBeenCalledWith('/leaves', {
      dateDebut: '2026-01-05',
      dateFin: '2026-01-05',
      codeM: '01',
      motifCng: 'test',
    });
  });

  it('posts multipart FormData when an attachment is provided', async () => {
    const axiosPrivate = {
      post: jest.fn().mockResolvedValue({ data: { data: { numDcng: 2 } } }),
    };
    const attachment = new File(['certificat'], 'certificat.pdf', { type: 'application/pdf' });

    await createLeaveRequest(axiosPrivate, {
      dateDebut: '2026-01-05',
      dateFin: '2026-01-05',
      codeM: '02',
      attachment,
    });

    const [, body, config] = axiosPrivate.post.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('attachment')).toBe(attachment);
    expect(body.get('request')).toBeInstanceOf(Blob);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });
});
