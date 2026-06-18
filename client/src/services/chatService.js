const chatService = (axiosPrivate) => ({
    getContacts: async () => {
        const response = await axiosPrivate.get('/chat/contacts');
        return response.data.data;
    },

    getChatHistory: async (otherMatPers) => {
        const response = await axiosPrivate.get(`/chat/messages/${otherMatPers}`);
        return response.data.data;
    },

    markAsRead: async (otherMatPers) => {
        const response = await axiosPrivate.post(`/chat/messages/${otherMatPers}/read`);
        return response.data.data;
    },

    sendMessage: async ({ recipientId, content, type = 'TEXT', attachmentId = null }) => {
        const response = await axiosPrivate.post('/chat/messages', {
            recipientId,
            content,
            type,
            attachmentId,
        });
        return response.data.data;
    },

    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axiosPrivate.post('/chat/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.data; // Returns attachmentId
    },

    downloadFile: async (attachmentId, fileName) => {
        const response = await axiosPrivate.get(`/chat/files/${attachmentId}`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName || 'attachment');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
});

export default chatService;
