# Forensic Recovery Platform

A unified digital forensics platform for recovering deleted files and metadata from forensic disk images, primarily XFS and Btrfs, with filesystem-independent file carving support.

## Architecture

```
┌─────────────┐
│  FORENSIC   │
│  DISK IMAGE │
└──────┬──────┘
       ▼
┌─────────────┐
│  EVIDENCE   │
│   INTAKE    │
└──────┬──────┘
       ▼
┌─────────────┐
│ HASH +      │
│ INTEGRITY   │
└──────┬──────┘
       ▼
┌─────────────┐
│ FILESYSTEM  │
│  DETECTION  │
└──────┬──────┘
       ▼
┌─────────────┐
│ FORENSIC    │
│ ORCHESTRATOR│
└──────┬──────┘
       ▼
  ┌────┴────┐
  ▼         ▼
XFS      BTRFS
ENGINE   ENGINE
  │         │
  └────┬────┘
       ▼
  FILE CARVING
       ▼
   META ENGINE
       ▼
 ┌────┴────┐
 ▼         ▼
CORR   TIMELINE
       ▼
  VALIDATION
       ▼
  REPORT ENGINE
   (PDF/JSON/CSV)
```

## Features

- **Multi-engine orchestration**: XFS, Btrfs, and file carving engines
- **Unified artifact model**: Normalized artifacts with full provenance
- **Chain of custody**: Complete audit trail for all operations
- **Multi-engine correlation**: Deduplication and cross-engine matching
- **Confidence scoring**: Evidence-based recovery confidence
- **Forensic reporting**: PDF, JSON, and CSV reports
- **Local-first**: Runs entirely on local infrastructure

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 |
| Database | PostgreSQL (prod), SQLite (dev) |
| Queue | Redis + Celery (prod), in-memory (dev) |
| Infra | Docker, Docker Compose |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker (optional, for PostgreSQL/Redis)

### Development Setup

1. **Clone and setup backend**
```bash
cd forensic-recovery-platform
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e "backend[dev]"
cp .env.example .env
```

2. **Setup frontend**
```bash
cd frontend
npm install
```

3. **Run backend**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. **Run frontend**
```bash
cd frontend
npm run dev
```

5. **Access**
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:3000

### Docker (when available)
```bash
docker-compose up -d
```

## API Endpoints

### Cases
- `POST /api/v1/cases` - Create case
- `GET /api/v1/cases` - List cases
- `GET /api/v1/cases/{case_id}` - Get case
- `PATCH /api/v1/cases/{case_id}` - Update case

### Evidence
- `POST /api/v1/cases/{case_id}/evidence` - Upload evidence
- `GET /api/v1/cases/{case_id}/evidence` - List evidence
- `GET /api/v1/evidence/{evidence_id}` - Get evidence
- `GET /api/v1/evidence/{evidence_id}/hash` - Verify hash
- `POST /api/v1/cases/{case_id}/evidence/{evidence_id}/verify` - Verify evidence integrity (SHA-256)
- `POST /api/v1/cases/{case_id}/evidence/{evidence_id}/detect-filesystem` - Detect filesystem type

### Analysis
- `POST /api/v1/cases/{case_id}/analysis` - Start analysis
- `GET /api/v1/cases/{case_id}/analysis` - List jobs
- `GET /api/v1/analysis/{job_id}` - Get job details
- `GET /api/v1/analysis/{job_id}/status` - Get job status

### Artifacts
- `GET /api/v1/cases/{case_id}/artifacts` - List artifacts
- `GET /api/v1/artifacts/{artifact_id}` - Get artifact
- `GET /api/v1/artifacts/{artifact_id}/provenance` - Get provenance

### Timeline
- `GET /api/v1/cases/{case_id}/timeline` - Get timeline

## Project Structure

```
forensic-recovery-platform/
├── frontend/                 # Next.js frontend
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/              # REST endpoints
│   │   ├── core/             # Config, DB, security, logging
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   ├── orchestrator/     # Job orchestration
│   │   ├── adapters/         # Engine adapters
│   │   ├── meta_engine/      # Normalization, correlation
│   │   └── reporting/        # Report generation
│   └── tests/
├── contracts/v1/             # JSON schemas
├── infrastructure/           # Docker, scripts
├── evidence/                 # Local evidence storage
├── test-data/                # Synthetic test images
└── docs/
```

## Development Phases

1. **Phase 1 - Foundation** ✓: Repository structure, config, DB, API, Docker
2. **Phase 2 - Evidence** ✓: Case/evidence management, streaming SHA-256, integrity verification, filesystem detection, audit trail, frontend evidence workflow
3. **Phase 3 - Mock Pipeline**: Mock engines, orchestrator, job system
4. **Phase 4 - XFS Integration**: Real XFS engine integration
5. **Phase 5 - Btrfs Integration**: Real Btrfs engine integration
6. **Phase 6 - Carving**: File carving integration
7. **Phase 7 - Meta Engine**: Normalization, correlation, confidence, timeline
8. **Phase 8 - Reporting**: PDF, JSON, CSV reports
9. **Phase 9 - Dashboard**: Forensic console UI
10. **Phase 10 - Public UI**: Landing, project, scalability, business pages
11. **Phase 11 - Hardening**: Security, performance, failure testing

## Security

- Evidence treated as untrusted input
- Path traversal protection
- Subprocess isolation
- Shell injection prevention
- Read-only evidence handling
- Secure temporary directories
- Authentication & authorization
- Audit logging

## License

Proprietary - Forensic Recovery Platform