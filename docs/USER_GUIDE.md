# Forensic Recovery Workstation — Investigator User Guide

## 1. Quick Start Guide

### 1.1 Command-Line Interface (CLI)
The orensic-recovery CLI binary provides direct command-line execution for scripting, batch jobs, and headless forensic environments:

`ash
# Initialize a new forensic case
forensic-recovery case create --case-number "CR-2026-0891" --title "Apex Investigation" --investigator "Dr. Vance"

# Ingest and verify an evidence image (calculates SHA-256 and BLAKE3)
forensic-recovery evidence add --case-id "<CASE_ID>" --source "/path/to/evidence.raw"

# Scan the image for deleted inodes & unallocated data
forensic-recovery scan --evidence-id "<EVIDENCE_ID>" --threads 8

# Generate investigation report
forensic-recovery report --case-id "<CASE_ID>" --format html --output report.html
`

### 1.2 Graphical Desktop Workstation
1. Launch the application:
   `ash
   cd frontend
   npm run dev
   `
2. Navigate the left sidebar:
   - **Dashboard**: High-level incident overview, write-block health status, active cases.
   - **Cases**: Case container management and lead investigator tracking.
   - **Evidence**: Mounting disk images, verifying read-only flags, and recalculating SHA-256 / BLAKE3 hashes.
   - **Deleted Files**: Explore unlinked inodes, examine confidence signals, and review hex dumps.
   - **Recovered Files**: Batch-export reconstructed artifacts safely with execution bits stripped.
   - **Timeline**: Interactive super-timeline filtering events by MACB timestamps.
   - **Reports**: Generate court-admissible PDF, HTML, JSON, or CSV reports.
   - **Audit Log**: Verify the append-only chronological log of all operator actions.
