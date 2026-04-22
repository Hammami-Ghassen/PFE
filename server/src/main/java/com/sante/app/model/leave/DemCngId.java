package com.sante.app.model.leave;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class DemCngId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "\"COD_SOC\"", nullable = false, length = 4)
    private String codSoc;

    @Column(name = "\"MAT_PERS\"", nullable = false, length = 10)
    private String matPers;

    @Column(name = "\"NUM_DCNG\"", nullable = false)
    private Integer numDcng;
}
