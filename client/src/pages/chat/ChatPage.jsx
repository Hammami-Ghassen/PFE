import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PaperClipIcon, PaperAirplaneIcon, DocumentIcon, ArrowDownTrayIcon, FunnelIcon, ChatBubbleLeftIcon, UserGroupIcon, UserIcon, MagnifyingGlassIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useChatWebSocket from '../../hooks/useChatWebSocket';
import chatService from '../../services/chatService';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';

export default function ChatPage() {
    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const filteredContacts = contacts.filter(c => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (c.name && c.name.toLowerCase().includes(q)) || 
               (c.matPers && c.matPers.toLowerCase().includes(q) && c.role !== 'GROUPE');
    });

    const handleMessageReceived = (message) => {
        const targetContactId = message.roomId ? message.roomId : (message.senderId === auth.user.matPers ? message.recipientId : message.senderId);

        // Update messages if it belongs to current active discussion
        if (activeContact && activeContact.matPers === targetContactId) {
            setMessages(prev => {
                // Deduplicate if we already optimistically added it 
                // (matching content and sender since optimistic ID might differ from DB ID)
                const isDuplicate = prev.some(m => m.id === message.id || (m.senderId === message.senderId && m.content === message.content && (!m.id || m.id > 1000000000000)));
                if (isDuplicate) return prev;
                return [...prev, message];
            });
            if (!message.roomId && message.recipientId === auth.user.matPers) {
                // Mark as read immediately if window is open
                chatService.markAsRead(message.senderId).catch(console.error);
            }
        }

        // Update contact last message & unread count
        setContacts(prev => prev.map(c => {
            if (c.matPers === targetContactId) {
                return {
                    ...c,
                    lastMessage: message,
                    unreadCount: (message.senderId !== auth.user.matPers && (!activeContact || activeContact.matPers !== c.matPers)) 
                        ? c.unreadCount + 1 
                        : c.unreadCount
                };
            }
            return c;
        }));
    };

    const chatWs = useChatWebSocket(handleMessageReceived);

    useEffect(() => {
        loadContacts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeContact) {
            loadMessages(activeContact.matPers);
            // reset unread locally
            setContacts(prev => prev.map(c => c.matPers === activeContact.matPers ? { ...c, unreadCount: 0 } : c));
            chatService.markAsRead(activeContact.matPers).catch(console.error);
        }
    }, [activeContact]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadContacts = async () => {
        try {
            setLoadingContacts(true);
            const data = await chatService.getContacts();
            setContacts(data);
        } catch (err) {
            toast.error("Erreur lors du chargement des contacts.");
        } finally {
            setLoadingContacts(false);
        }
    };

    const loadMessages = async (otherMatPers) => {
        try {
            setLoadingMessages(true);
            const data = await chatService.getChatHistory(otherMatPers);
            setMessages(data);
        } catch (err) {
            toast.error("Erreur lors du chargement de l'historique.");
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeContact) return;

        try {
            chatWs.sendMessage(activeContact.matPers, newMessage);
            
            // Optimistic update
            const optimisticMsg = {
                id: Date.now(),
                senderId: auth.user.matPers,
                senderName: auth.user.prenom + " " + auth.user.nom || auth.user.matPers,
                recipientId: activeContact.matPers.startsWith("ROOM_") ? null : activeContact.matPers,
                roomId: activeContact.matPers.startsWith("ROOM_") ? activeContact.matPers : null,
                content: newMessage,
                timestamp: new Date().toISOString(),
                type: 'TEXT'
            };
            setMessages(prev => [...prev, optimisticMsg]);
            setContacts(prev => prev.map(c => 
                c.matPers === activeContact.matPers ? { ...c, lastMessage: optimisticMsg } : c
            ));
            
            setNewMessage('');
        } catch (err) {
            toast.error("Erreur lors de l'envoi.");
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeContact) return;
        
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Le fichier dépasse la limite de 5MB.");
            return;
        }

        try {
            setUploading(true);
            const attachmentId = await chatService.uploadFile(file);
            chatWs.sendMessage(activeContact.matPers, "Pièce jointe", 'FILE', attachmentId);
            // For now, refreshing history to get the file metadata optimally
            // Wait a small delay to let backend save and WS to echo or just refetch
            setTimeout(() => loadMessages(activeContact.matPers), 500);
        } catch (err) {
            if (err.response?.data?.message) {
                toast.error(err.response.data.message);
            } else {
                toast.error("Erreur lors de l'upload du fichier.");
            }
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-lg shadow overflow-hidden">
            {/* Contacts Sidebar */}
            <div className={`w-full md:w-1/3 md:border-r flex flex-col bg-gray-50 ${activeContact ? "hidden md:flex" : "flex"}`}>
                <div className="p-4 border-b bg-white">
                    <h2 className="text-lg font-bold text-gray-900">Discussions</h2>
                    <div className="mt-2 text-xs text-gray-500 flex items-center justify-between mb-2">
                        {chatWs.connected ? <span className="text-green-500">● Connecté</span> : <span className="text-red-500">● Hors ligne</span>}
                    </div>
                    <div className="relative mt-2">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-2.5 top-2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Rechercher (Nom ou Matricule)..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-ministere-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingContacts ? (
                        <div className="p-4 flex justify-center"><Spinner /></div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">Aucun contact trouvé.</div>
                    ) : (
                        filteredContacts.map(c => (
                            <div 
                                key={c.matPers}
                                onClick={() => setActiveContact(c)}
                                className={`p-4 border-b cursor-pointer transition-colors ${activeContact?.matPers === c.matPers ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-100 bg-white'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="font-medium text-gray-900 flex items-center gap-1.5 min-w-0 pr-2">
                                        {c.role === 'GROUPE' ? (
                                            <UserGroupIcon className="w-4 h-4 text-ministere-600 flex-shrink-0" />
                                        ) : c.role === 'DIRECTEUR' ? (
                                            <BriefcaseIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        ) : (
                                            <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        )}
                                        <span className="truncate">{c.name}</span>
                                    </div>
                                    {c.unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">{c.unreadCount}</span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 truncate mt-1 flex items-center">
                                    {c.role !== 'GROUPE' && (
                                        <span 
                                            className={`text-[10px] px-1.5 py-0.5 rounded mr-1.5 border inline-flex items-center flex-shrink-0 max-w-[140px] truncate ${
                                                c.role === 'DIRECTEUR' 
                                                ? 'bg-blue-50 text-blue-700 border-blue-200 font-medium' 
                                                : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`} 
                                            title={`${c.matPers}${c.role === 'DIRECTEUR' ? ' - ' + (c.libSoc || c.codSoc) : ''}`}
                                        >
                                            {c.role === 'DIRECTEUR' ? `DIR - ${c.libSoc || c.codSoc}` : `AGT - ${c.matPers}`}
                                        </span>
                                    )}
                                    <span className="truncate">{c.lastMessage?.type === 'FILE' ? '📎 Pièce jointe' : c.lastMessage?.content || 'Nouvelle discussion'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className={`w-full md:w-2/3 flex flex-col bg-white ${!activeContact ? "hidden md:flex" : "flex"}`}>
                {activeContact ? (
                    <>
                        <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <button className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700" onClick={() => setActiveContact(null)}><ChatBubbleLeftIcon className="w-6 h-6 transform rotate-180" /></button>
                                {activeContact.role === 'GROUPE' ? (
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-ministere-600 flex-shrink-0">
                                        <UserGroupIcon className="w-6 h-6" />
                                    </div>
                                ) : activeContact.role === 'DIRECTEUR' ? (
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 flex-shrink-0">
                                        <BriefcaseIcon className="w-6 h-6" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                                        <UserIcon className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-gray-900 truncate">{activeContact.name}</h3>
                                    <p className="text-xs text-gray-500 truncate">
                                        {activeContact.role === 'GROUPE' ? 'Discussion de groupe' : 
                                         activeContact.role === 'DIRECTEUR' ? `${activeContact.matPers} - ${activeContact.role} - ${activeContact.libSoc || activeContact.codSoc}` :
                                         `${activeContact.matPers} - ${activeContact.role}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {loadingMessages ? (
                                <div className="flex justify-center py-10"><Spinner /></div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">Envoyez un message pour démarrer la discussion.</div>
                            ) : (
                                messages.map((m, idx) => {
                                    const isMe = m.senderId === auth.user.matPers;
                                    return (
                                        <div key={m.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className="text-xs text-gray-500 mb-1 ml-1 mr-1">
                                                {m.senderName || m.senderId}
                                            </div>
                                            <div className={`max-w-[70%] rounded-lg p-3 ${isMe ? 'bg-ministere-600 text-white rounded-br-none' : 'bg-white border text-gray-900 rounded-bl-none shadow-sm'}`}>
                                                {m.type === 'FILE' && m.attachment ? (
                                                    <div className="flex items-center gap-3 bg-white/10 p-2 rounded">
                                                        <DocumentIcon className="w-8 h-8" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{m.attachment.fileName}</p>
                                                            <p className="text-xs opacity-70">{(m.attachment.fileSize / 1024).toFixed(1)} KB</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => chatService.downloadFile(m.attachment.id, m.attachment.fileName).catch(() => toast.error("Erreur lors du téléchargement"))}
                                                            className="p-1 hover:bg-white/20 rounded transition-colors"
                                                            title="Télécharger"
                                                        >
                                                            <ArrowDownTrayIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                                                )}
                                                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-ministere-100' : 'text-gray-400'}`}>
                                                    {format(new Date(m.timestamp), 'HH:mm')}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t">
                            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png,.docx,.csv,.xlsx,.xls"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="p-2 text-gray-500 hover:text-ministere-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                                >
                                    {uploading ? <Spinner size="sm" /> : <PaperClipIcon className="w-6 h-6" />}
                                </button>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Écrivez un message..."
                                    className="flex-1 max-h-32 min-h-[44px] p-2.5 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ministere-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-2.5 bg-ministere-600 text-white rounded-lg hover:bg-ministere-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 h-full">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            <ChatBubbleLeftIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p>Sélectionnez une discussion pour commencer</p>
                    </div>
                )}
            </div>
        </div>
    );
}