package com.sante.app.repository;

import com.sante.app.model.legacy.Societe;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SocieteRepository extends JpaRepository<Societe, String> {
    List<Societe> findAllByOrderByLibSocAsc();
}
