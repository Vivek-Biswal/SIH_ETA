# Group A - Chunk 1 Report: Journey Reconstruction

This document serves as the final report for the completion of Group A Chunk 1 of the SIH Indian Train ETA Project.

## 1. Work Completed
- Inspected the processed data module to determine feasibility of reconstructing train journeys.
- Designed a reproducible methodology to reconstruct sequential routes despite the absence of explicit `sequence` or `distance` parameters in the schedules dataset.
- Formalised the definitions of Journeys through a strict Data Contract.
- Implemented a standard schema for representing Scheduled Journeys.
- Wrote and executed automated tests and validation scripts to check the quality of the reconstruction.

## 2. Files Modified/Created
**Created:**
- `docs/journey_data_contract.md`: Establishes the boundaries and definitions of a journey.
- `src/journey/__init__.py`: Module init.
- `src/journey/reconstruct.py`: Contains the methodology for reconstructing journeys based on `day` and time offsets.
- `src/journey/validators.py`: Custom logic to detect sequential logical errors, duplicates, and missing points in journeys.
- `src/run_journey_reconstruction.py`: A reproducible runner that loads clean schedules and performs the reconstruction and validation logic.
- `reports/journey_reconstruction_quality.csv`: The validation check results summary.
- `docs/journey_reconstruction.md`: Documentation on methodology, schema, and quality constraints.
- `tests/test_journey.py`: Unit tests for sequence logic and validation filters.

**Modified:**
- `README.md`: Added instructions and limitations regarding the new Journey Reconstruction feature.

## 3. Input Datasets Used
- `data/processed/schedules_clean.json` (Primary)
- `data/processed/trains_clean.json` (Metadata/Verification)

## 4. Journey Reconstruction Methodology
To convert isolated stops into a logical sequence, the `schedules_clean.json` records were grouped by `train_number`. Within each group, stops were sorted primarily by the `day` variable, followed by the `arrival` time (defaulting to `departure` time at the origin station). After sorting, an explicit integer `sequence` was generated.

## 5. Metrics & Validation Results
- **Journeys Reconstructed**: 5,208
- **Total Stops Processed**: 416,636
- **Test Results**: All tests (`tests/test_journey.py`) passed successfully.
- **Quality Check Results**: Validation flagged ~44,951 instances of `Missing Intermediate Time` where intermediate stops lacked arrival or departure times (commonly pass-through stations). These were preserved to maintain route topology.

## 6. Scientific Limitations
**THIS MODULE PRODUCES SCHEDULED JOURNEYS ONLY.**
The reconstructed journeys represent the baseline static route the train is *supposed* to take. The datasets used do **not** contain historical movement logs, therefore it is **not possible** to reconstruct the *actual historical journeys* with real arrival/departure timestamps.

## 7. Ready for Next Chunk
The project now holds a standard, sequential, and statically reconstructed route architecture (`data/processed/journeys_scheduled.json`). We are now ready to hand off the project for the next phase (e.g., EDA, schedule-based feature engineering, or topology modeling) with a firm, clean foundation.
