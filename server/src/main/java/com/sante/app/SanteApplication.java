package com.sante.app;

import com.sante.app.model.User;
import com.sante.app.model.enums.Role;
import com.sante.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@SpringBootApplication
@EnableConfigurationProperties
public class SanteApplication {

    public static void main(String[] args) {
        SpringApplication.run(SanteApplication.class, args);
    }
}

@Component
@RequiredArgsConstructor
@Slf4j
class AdminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (!userRepository.existsByCin("99999999")) {
            User admin = User.builder()
                    .cin("99999999")
                    .nom("Admin")
                    .prenom("Système")
                    .email("admin@sante.tn")
                    .role(Role.ADMIN)
                    .password(passwordEncoder.encode("Admin@2025!Sante"))
                    .active(true)
                    .mustChangePassword(false)
                    .build();

            userRepository.save(admin);
            log.info("✅ Administrateur initial créé — CIN: 99999999 / Mot de passe: Admin@2025!Sante");
        }
    }
}
