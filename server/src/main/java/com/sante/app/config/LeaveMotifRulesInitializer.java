package com.sante.app.config;

import com.sante.app.model.leave.MotifJ;
import com.sante.app.repository.MotifJRepository;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class LeaveMotifRulesInitializer implements ApplicationRunner {

    private final MotifJRepository motifJRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Map<String, Rule> rules = new HashMap<>();
        rules.put("01", new Rule(false, 30, null, true, false));
        for (String code : new String[]{"10", "11", "13", "14", "17", "18"}) {
            rules.put(code, new Rule(false, 6, null, false, false));
        }
        rules.put("15", new Rule(false, null, 30, false, false));
        rules.put("04", new Rule(false, 60, null, false, false));
        rules.put("05", new Rule(false, 120, null, false, true));
        rules.put("12", new Rule(false, 10, null, false, false));
        rules.put("50", new Rule(false, 90, null, false, false));
        rules.put("02", new Rule(true, null, null, false, false));
        rules.put("03", new Rule(true, null, null, false, false));
        rules.put("16", new Rule(true, null, null, false, false));
        rules.put("F", new Rule(true, null, null, false, false));
        rules.put("54", new Rule(true, null, null, false, false));
        rules.put("56", new Rule(true, null, null, false, false));
        rules.put("57", new Rule(true, null, null, false, false));

        motifJRepository.findAll().forEach(motif -> applyRule(motif, rules.get(motif.getCodM())));

        motifJRepository.findById("04").ifPresent(motif -> {
            motif.setSexe("F");
            motifJRepository.save(motif);
        });
        motifJRepository.findById("12").ifPresent(motif -> {
            motif.setSexe("M");
            motifJRepository.save(motif);
        });

        MotifJ postnatal = motifJRepository.findById("05").orElseGet(() -> {
            MotifJ motif = new MotifJ();
            motif.setCodM("05");
            motif.setTypCng("02");
            motif.setLibMot("Cong\u00e9 postnatal");
            motif.setSexe("F");
            return motif;
        });
        applyRule(postnatal, rules.get("05"));
        if (postnatal.getLibMot() == null || postnatal.getLibMot().isBlank()) {
            postnatal.setLibMot("Cong\u00e9 postnatal");
        }
        if (postnatal.getTypCng() == null || postnatal.getTypCng().isBlank()) {
            postnatal.setTypCng("02");
        }
        postnatal.setSexe("F");
        motifJRepository.save(postnatal);
    }

    private void applyRule(MotifJ motif, Rule rule) {
        Rule normalizedRule = rule == null ? Rule.DEFAULT : rule;
        motif.setRequiresAttachment(normalizedRule.requiresAttachment());
        motif.setMaxDaysPerYear(normalizedRule.maxDaysPerYear());
        motif.setMaxDaysPerCareer(normalizedRule.maxDaysPerCareer());
        motif.setDeductsFromBalance(normalizedRule.deductsFromBalance());
        motif.setIsHalfPay(normalizedRule.isHalfPay());
        motifJRepository.save(motif);
    }

    private record Rule(
            boolean requiresAttachment,
            Integer maxDaysPerYear,
            Integer maxDaysPerCareer,
            boolean deductsFromBalance,
            boolean isHalfPay
    ) {
        private static final Rule DEFAULT = new Rule(false, null, null, false, false);
    }
}
