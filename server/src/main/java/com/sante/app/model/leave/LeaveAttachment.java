package com.sante.app.model.leave;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "\"LEAVE_ATTACHMENTS\"")
@Getter
@Setter
public class LeaveAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ID\"")
    private Long id;

    @Column(name = "\"COD_SOC\"", nullable = false, length = 4)
    private String codSoc;

    @Column(name = "\"MAT_PERS\"", nullable = false, length = 10)
    private String matPers;

    @Column(name = "\"NUM_DCNG\"", nullable = false)
    private Integer numDcng;

    @Column(name = "\"FILE_NAME\"", nullable = false)
    private String fileName;

    @Column(name = "\"FILE_TYPE\"", nullable = false)
    private String fileType;

    @Column(name = "\"FILE_SIZE\"", nullable = false)
    private Long fileSize;

    @Basic(fetch = FetchType.LAZY)
    @Column(name = "\"CONTENT\"", nullable = false)
    private byte[] content;

    @CreationTimestamp
    @Column(name = "\"CREATED_AT\"", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
