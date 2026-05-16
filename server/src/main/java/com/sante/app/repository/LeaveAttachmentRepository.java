package com.sante.app.repository;

import com.sante.app.model.leave.LeaveAttachment;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeaveAttachmentRepository extends JpaRepository<LeaveAttachment, Long> {

    Optional<LeaveAttachment> findByCodSocAndMatPersAndNumDcng(String codSoc, String matPers, Integer numDcng);

    boolean existsByCodSocAndMatPersAndNumDcng(String codSoc, String matPers, Integer numDcng);
}
