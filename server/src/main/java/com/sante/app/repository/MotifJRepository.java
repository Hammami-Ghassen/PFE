package com.sante.app.repository;

import com.sante.app.model.leave.MotifJ;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MotifJRepository extends JpaRepository<MotifJ, String> {

    List<MotifJ> findAllByOrderByCodMAsc();
}
