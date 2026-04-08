from __future__ import annotations

import argparse
import logging
from datetime import date

from etl.config import load_settings
from etl.extract import SourceExtractor
from etl.load import WarehouseLoader
from etl.transform import (
    combine_dimension_batches,
    transform_demande_conge,
    transform_justificatif_conge,
    transform_personnel_and_effectif,
    transform_pointage_chunk,
    transform_retard_chunk,
)

LOGGER = logging.getLogger(__name__)



def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )



def prepare_schema() -> None:
    settings = load_settings()
    dw_engine = settings.create_dw_engine()
    try:
        loader = WarehouseLoader(
            engine=dw_engine,
            sql_dir=settings.sql_dir,
            pipeline_name=settings.pipeline_name,
        )
        loader.prepare_schema()
        LOGGER.info("DW schema prepared successfully")
    finally:
        dw_engine.dispose()



def run_quality_checks(raise_on_failure: bool = True) -> list[dict]:
    settings = load_settings()
    dw_engine = settings.create_dw_engine()
    try:
        loader = WarehouseLoader(
            engine=dw_engine,
            sql_dir=settings.sql_dir,
            pipeline_name=settings.pipeline_name,
        )
        checks = loader.run_quality_checks(
            quality_sql_file=settings.quality_sql_file,
            raise_on_failure=raise_on_failure,
        )
        LOGGER.info("Quality checks executed: %s", len(checks))
        return checks
    finally:
        dw_engine.dispose()



def run_pipeline() -> dict:
    settings = load_settings()
    source_engine = settings.create_source_engine()
    dw_engine = settings.create_dw_engine()
    run_counts = {
        "rows_effectif": 0,
        "rows_demande_conge": 0,
        "rows_justif_conge": 0,
        "rows_pointage": 0,
        "rows_retard": 0,
    }

    run_id = None
    try:
        extractor = SourceExtractor(
            engine=source_engine,
            chunk_size=settings.chunk_size,
            schema=settings.source_schema,
        )
        loader = WarehouseLoader(
            engine=dw_engine,
            sql_dir=settings.sql_dir,
            pipeline_name=settings.pipeline_name,
        )

        if settings.auto_prepare_schema:
            loader.prepare_schema()
            LOGGER.info("Schema auto-prepare completed")

        run_id = loader.start_run_log()
        LOGGER.info("Started ETL run with run_id=%s", run_id)

        snapshot_date = date.today()
        references = extractor.extract_reference_tables()

        personnel_raw = extractor.extract_personnel()
        demande_raw = extractor.extract_demande_conge()
        justif_raw = extractor.extract_justificatif_conge()

        personnel_tx = transform_personnel_and_effectif(
            personnel_df=personnel_raw,
            references=references,
            snapshot_date=snapshot_date,
        )
        demande_tx = transform_demande_conge(
            demande_df=demande_raw,
            motif_reference_df=references.get("motif_conge"),
        )
        justif_tx = transform_justificatif_conge(justif_df=justif_raw)

        base_dimensions = combine_dimension_batches(
            personnel_tx["dimensions"],
            demande_tx["dimensions"],
            justif_tx["dimensions"],
        )
        loader.upsert_dimensions(base_dimensions)

        run_counts["rows_effectif"] = loader.load_effectif_snapshot(personnel_tx["fact"])
        run_counts["rows_demande_conge"] = loader.load_demande_conge(demande_tx["fact"])
        run_counts["rows_justif_conge"] = loader.load_justificatif_conge(justif_tx["fact"])

        watermark = loader.get_watermark()
        pointage_start_date = watermark.last_pointage_date
        retard_start_date = watermark.last_retard_date

        max_pointage_date = watermark.last_pointage_date
        max_retard_date = watermark.last_retard_date

        for pointage_chunk in extractor.iter_pointage(start_date=pointage_start_date):
            pointage_tx = transform_pointage_chunk(pointage_chunk)
            loader.upsert_dimensions(pointage_tx["dimensions"])
            run_counts["rows_pointage"] += loader.load_pointage_chunk(pointage_tx["fact"])
            if not pointage_tx["fact"].empty:
                chunk_max = pointage_tx["fact"]["event_date"].max()
                max_pointage_date = chunk_max if max_pointage_date is None else max(max_pointage_date, chunk_max)

        for retard_chunk in extractor.iter_retard_journalier(start_date=retard_start_date):
            retard_tx = transform_retard_chunk(retard_chunk)
            loader.upsert_dimensions(retard_tx["dimensions"])
            run_counts["rows_retard"] += loader.load_retard_chunk(retard_tx["fact"])
            if not retard_tx["fact"].empty:
                chunk_max = retard_tx["fact"]["event_date"].max()
                max_retard_date = chunk_max if max_retard_date is None else max(max_retard_date, chunk_max)

        quality_results = loader.run_quality_checks(
            quality_sql_file=settings.quality_sql_file,
            raise_on_failure=True,
        )

        loader.update_watermark(
            last_pointage_date=max_pointage_date,
            last_retard_date=max_retard_date,
        )

        loader.finish_run_log(run_id=run_id, status="SUCCESS", counts=run_counts)
        LOGGER.info("ETL completed successfully with counts: %s", run_counts)
        return {"counts": run_counts, "quality_checks": quality_results}

    except Exception as exc:
        LOGGER.exception("ETL pipeline failed")
        if run_id is not None:
            loader = WarehouseLoader(
                engine=dw_engine,
                sql_dir=settings.sql_dir,
                pipeline_name=settings.pipeline_name,
            )
            loader.finish_run_log(
                run_id=run_id,
                status="FAILED",
                counts=run_counts,
                error_message=str(exc)[:4000],
            )
        raise

    finally:
        source_engine.dispose()
        dw_engine.dispose()



def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ETL grh_msp -> DW_msp")
    parser.add_argument(
        "--action",
        choices=["prepare-schema", "run", "quality-checks"],
        default="run",
        help="Action to execute",
    )
    return parser.parse_args()



def main() -> None:
    _configure_logging()
    args = parse_args()

    if args.action == "prepare-schema":
        prepare_schema()
        return

    if args.action == "quality-checks":
        checks = run_quality_checks(raise_on_failure=False)
        failed = [check for check in checks if not bool(check.get("passed"))]
        if failed:
            raise RuntimeError(f"Quality checks failed: {failed}")
        return

    run_pipeline()


if __name__ == "__main__":
    main()
