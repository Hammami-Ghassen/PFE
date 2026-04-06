package com.sante.app.security;

import com.sante.app.model.User;
import com.sante.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String cin) throws UsernameNotFoundException {
        User user = userRepository.findByCin(cin)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé: " + cin));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getCin())
                .password(user.getPassword())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .disabled(!user.getActive())
                .build();
    }
}
