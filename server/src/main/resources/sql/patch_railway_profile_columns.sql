-- Adds nullable profile lookup columns expected by PersonnelRepository.findAuthProfileByMatPers.
-- Safe to rerun.

ALTER TABLE "ADR_PERS"
    ADD COLUMN IF NOT EXISTS "RUE" varchar(100),
    ADD COLUMN IF NOT EXISTS "COD_DELEG" varchar(4);

ALTER TABLE "PERSONNEL"
    ADD COLUMN IF NOT EXISTS "COD_SERV" varchar(10),
    ADD COLUMN IF NOT EXISTS "COD_CATEG" varchar(4),
    ADD COLUMN IF NOT EXISTS "COD_CAT" varchar(4),
    ADD COLUMN IF NOT EXISTS "COD_GRAD" varchar(4),
    ADD COLUMN IF NOT EXISTS "POSTE_TRAV" varchar(15);
