CREATE SCHEMA IF NOT EXISTS dw;

-- Table technique simple pour suivre les chargements
CREATE TABLE IF NOT EXISTS dw.etl_batch (
    batch_id         BIGSERIAL PRIMARY KEY,
    process_name     VARCHAR(100) NOT NULL,
    start_time       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time         TIMESTAMP,
    status           VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    rows_loaded      BIGINT DEFAULT 0,
    message          TEXT
);

-- Vue utile pour vérifier rapidement le schéma DW
CREATE OR REPLACE VIEW dw.v_dw_tables AS
SELECT
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema = 'dw'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;