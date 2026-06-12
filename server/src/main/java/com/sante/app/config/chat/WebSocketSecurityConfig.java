package com.sante.app.config.chat;

import com.sante.app.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Collections;

@Configuration
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);
                        if (jwtTokenProvider.validateToken(token) && "access".equals(jwtTokenProvider.getTokenType(token))) {
                            String subject = jwtTokenProvider.getSubjectFromToken(token);
                            String role = jwtTokenProvider.getRoleFromToken(token);
                            if ("ADMIN".equals(role)) {
                                throw new IllegalArgumentException("Acces chat interdit pour les administrateurs");
                            }
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                    subject, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))
                            );
                            accessor.setUser(auth);
                        } else {
                            throw new IllegalArgumentException("Token JWT invalide ou expiré");
                        }
                    } else {
                        throw new IllegalArgumentException("Header Authorization manquant ou invalide");
                    }
                }
                return message;
            }
        });
    }
}
