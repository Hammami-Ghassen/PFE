import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import useAuth from './useAuth';

const useChatWebSocket = (onMessageReceived) => {
    const { auth } = useAuth();
    const config = window.ENV || process.env;
    const apiUrl = config.REACT_APP_API_URL || 'http://localhost:8080/api';
    const wsUrl = apiUrl.replace('/api', '/ws-chat');

    const [connected, setConnected] = useState(false);
    const clientRef = useRef(null);
    const onMessageReceivedRef = useRef(onMessageReceived);

    useEffect(() => {
        onMessageReceivedRef.current = onMessageReceived;
    }, [onMessageReceived]);

    const connect = useCallback(() => {
        if (!auth?.accessToken) return;

        const client = new Client({
            // Using SockJS for fallback capability
            webSocketFactory: () => new SockJS(wsUrl),
            connectHeaders: {
                Authorization: `Bearer ${auth.accessToken}`
            },
            debug: function (str) {
                // console.log(str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                setConnected(true);
                // Subscribe to user-specific private queue
                client.subscribe('/user/queue/messages', (message) => {
                    const payload = JSON.parse(message.body);
                    if (onMessageReceivedRef.current) {
                        onMessageReceivedRef.current(payload);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
                setConnected(false);
            },
            onWebSocketClose: () => {
                setConnected(false);
            }
        });

        client.activate();
        clientRef.current = client;
    }, [auth?.accessToken, wsUrl]);

    const disconnect = useCallback(() => {
        if (clientRef.current) {
            clientRef.current.deactivate();
        }
    }, []);

    const sendMessage = useCallback((recipientId, content, type = 'TEXT', attachmentId = null) => {
        if (clientRef.current && connected) {
            clientRef.current.publish({
                destination: '/app/chat',
                body: JSON.stringify({ recipientId, content, type, attachmentId })
            });
        }
    }, [connected]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return { connected, sendMessage };
};

export default useChatWebSocket;
