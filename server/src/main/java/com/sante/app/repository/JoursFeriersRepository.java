package com.sante.app.repository;

import com.sante.app.model.leave.JoursFeriers;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JoursFeriersRepository extends JpaRepository<JoursFeriers, String> {

    List<JoursFeriers> findAllByOrderByCodFerieAsc();
}
