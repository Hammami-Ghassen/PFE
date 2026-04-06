package com.sante.app.dto.response;

import com.sante.app.model.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String cin;
    private String nom;
    private String prenom;
    private String email;
    private Role role;
    private Boolean active;
    private Boolean mustChangePassword;
    private LocalDateTime createdAt;
}
