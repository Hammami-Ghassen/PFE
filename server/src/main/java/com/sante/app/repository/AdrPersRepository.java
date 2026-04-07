package com.sante.app.repository;

import com.sante.app.model.legacy.AdrPers;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdrPersRepository extends JpaRepository<AdrPers, String> {
}
