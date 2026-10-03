# Forensic Recovery Platform — Project Plan

## 1. Architecture Overview

```
forensic-recovery-platform/
|
+-- frontend/                 # Next.js + React + TypeScript + Tailwind
|   +-- app/                  # App Router pages
|   +-- components/           # Shared UI components
|   +-- features/             # Feature-specific components
|   +-- lib/                  # Utilities, API clients
|   +-- hooks/                # React hooks
|   +-- types/                # TypeScript types
|   +-- public/               # Static assets
|
+-- backend/                  # FastAPI + Python
|   +-- app/
|   |   +-- api/              # REST endpoints
|   |   +-- core/             # Config, security, database
|   |   +-- models/           # SQLAlchemy models
|   |   +-- schemas/          # Pydantic schemas
|   |   +-- services/         # Business logic
|   |   +-- repositories/     # Data access
|   |   +-- orchestrator/     # Job orchestration
|   |   +-- workers/          # Background workers
|   |   +-- adapters/         # Engine adapters
|   |   |   +-- xfs/
|   |   |   +-- btrfs/
|   |   |   +-- carving/
|   |   |   +-- sleuthkit/
|   |   +-- meta_engine/      # Normalization, correlation, etc.
|   |   |   +-- normalization/
|   |   |   +-- hashing/
|   |   |   +-- provenance/
|   |   |   +-- correlation/
|   |   |   +-- confidence/
|   |   |   +-- timeline/
|   |   +-- reporting/        # Report generation
|   |       +-- pdf/
|   |       +-- json/
|   |       +-- csv/
|   +-- tests/
|
+-- contracts/                # JSON schemas (versioned)
|   +-- v1/
|       +-- artifact.schema.json
|       +-- evidence.schema.json
|       +-- analysis.schema.json
|       +-- recovery.schema.json
|       +-- report.schema.json
|       +-- event.schema.json
|
+-- infrastructure/
|   +-- docker/
|   +-- scripts/
|   +-- dev/
|
+-- evidence/                 # Local evidence storage
|   +-- input/
|   +-- working/
|   +-- recovered/
|   +-- artifacts/
|   +-- reports/
|
+-- test-data/                # Synthetic test images
|
+-- docs/
|
+-- docker-compose.yml
+-- .env.example
+-- README.md
+-- Makefile
+-- pyproject.toml
```

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+, React 18+, TypeScript, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 |
| Database | PostgreSQL (prod), SQLite (dev/test) |
| Queue | Redis + Celery (prod), in-memory queue (dev) |
| Workers | Python async workers |
| Infra | Docker, Docker Compose (when available) |
| Testing | pytest, pytest-asyncio, httpx |

## 3. Dependencies

### Backend (pyproject.toml)
```
fastapi>=0.110
uvicorn[standard]>=0.29
sqlalchemy>=2.0
alembic>=1.13
pydantic>=2.7
pydantic-settings>=2.3
python-multipart>=0.0.9
python-jose[cryptography]>=3.3
passlib[bcrypt]>=1.7
python-dotenv>=1.0
pytest>=8.2
pytest-asyncio>=0.23
httpx>=0.27
redis>=5.0
celery>=5.3
reportlab>=4.1
weasyprint>=61
jsonschema>=4.21
```

### Frontend (package.json)
```
next: ^14.2
react: ^18.3
react-dom: ^18.3
typescript: ^5.4
tailwindcss: ^3.4
@tailwindcss/forms: ^0.5
lucide-react: ^0.4
zod: ^3.23
react-hook-form: ^7.51
@tanstack/react-query: ^5.28
axios: ^1.7
socket.io-client: ^4.7
```

## 4. Implementation Phases

### Phase 1 — Foundation ✅ COMPLETE
- [x] Repository structure creation
- [x] Configuration management (.env, settings)
- [x] Database setup (SQLAlchemy + Alembic)
- [x] FastAPI app with health check
- [x] Docker / Docker Compose (when Docker available)
- [x] Logging configuration
- [x] Base contracts/schemas
- [x] Basic test infrastructure

### Phase 2 — Evidence Management ✅ COMPLETE
- [x] Case CRUD API
- [x] Evidence registration
- [x] SHA-256 hashing service (streaming)
- [x] Evidence storage (local filesystem with deterministic paths)
- [x] Audit trail / chain of custody events
- [x] Integrity verification endpoint
- [x] Filesystem detection (signature-based)
- [x] Analysis blocking on failed integrity
- [x] Frontend evidence workflow (case detail, evidence upload, verification, filesystem detection)

### Phase 3 — Mock Pipeline
- [ ] Mock XFS Adapter
- [ ] Mock Btrfs Adapter
- [ ] Mock Carving Adapter
- [ ] Orchestrator with job queue
- [ ] Normalized artifact output
- [ ] End-to-end mock flow

### Phase 4 — Real XFS Integration
- [ ] XFS Adapter (wraps external engine)
- [ ] XFS test image validation

### Phase 5 — Real Btrfs Integration
- [ ] Btrfs Adapter
- [ ] Btrfs test image validation

### Phase 6 — Carving Integration
- [ ] Carving Adapter (scalpel/photorec or similar)
- [ ] Correlation with filesystem results

### Phase 7 — Meta Engine
- [ ] Normalization
- [ ] Hashing
- [ ] Provenance tracking
- [ ] Deduplication
- [ ] Multi-engine correlation
- [ ] Confidence scoring
- [ ] Timeline engine

### Phase 8 — Reporting
- [ ] JSON reports
- [ ] CSV reports
- [ ] PDF reports

### Phase 9 — Forensic Dashboard
- [ ] Case/Evidence/Analysis views
- [ ] Artifact browser with provenance
- [ ] Timeline visualization
- [ ] Correlation view
- [ ] Report viewer

### Phase 10 — Public Product UI
- [ ] Landing page
- [ ] Animated project explanation
- [ ] Scalability page
- [ ] Business/end-user page
- [ ] Login/auth

### Phase 11 — Hardening
- [ ] Security review
- [ ] Performance testing
- [ ] Large image testing
- [ ] Failure mode testing

## 5. API Contracts (v1)

### Cases
```
POST   /api/v1/cases
GET    /api/v1/cases
GET    /api/v1/cases/{case_id}
PATCH  /api/v1/cases/{case_id}
DELETE /api/v1/cases/{case_id}
```

### Evidence
```
POST   /api/v1/cases/{case_id}/evidence
GET    /api/v1/cases/{case_id}/evidence
GET    /api/v1/evidence/{evidence_id}
GET    /api/v1/evidence/{evidence_id}/hash
```

### Analysis Jobs
```
POST   /api/v1/cases/{case_id}/analysis
GET    /api/v1/cases/{case_id}/analysis
GET    /api/v1/analysis/{job_id}
GET    /api/v1/analysis/{job_id}/status
WS     /api/v1/analysis/{job_id}/events
```

### Artifacts
```
GET    /api/v1/cases/{case_id}/artifacts
GET    /api/v1/artifacts/{artifact_id}
GET    /api/v1/artifacts/{artifact_id}/provenance
```

### Timeline
```
GET    /api/v1/cases/{case_id}/timeline
```

### Reports
```
POST   /api/v1/cases/{case_id}/reports
GET    /api/v1/reports/{report_id}
GET    /api/v1/reports/{report_id}/download
```

## 6. Database Schema (Core Tables)

```sql
-- users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'investigator',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- cases
CREATE TABLE cases (
    id UUID PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    investigator_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- evidence
CREATE TABLE evidence (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    evidence_number VARCHAR(50) UNIQUE NOT NULL,
    original_filename VARCHAR(500),
    stored_path VARCHAR(1000) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    mime_type VARCHAR(100),
    filesystem_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'imported',
    acquired_at TIMESTAMP DEFAULT NOW(),
    acquired_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'
);

-- analysis_jobs
CREATE TABLE analysis_jobs (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    evidence_id UUID REFERENCES evidence(id),
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'created',
    current_stage VARCHAR(50),
    progress_percent INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- engine_runs
CREATE TABLE engine_runs (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES analysis_jobs(id),
    engine_name VARCHAR(50) NOT NULL,
    engine_version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    command JSONB,
    stdout_path VARCHAR(500),
    stderr_path VARCHAR(500),
    exit_code INTEGER,
    duration_ms INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- artifacts
CREATE TABLE artifacts (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    evidence_id UUID REFERENCES evidence(id),
    artifact_number VARCHAR(50) UNIQUE NOT NULL,
    artifact_type VARCHAR(50) NOT NULL,
    name VARCHAR(500),
    path VARCHAR(1000),
    filesystem VARCHAR(50),
    size_bytes BIGINT,
    timestamps JSONB,
    hashes JSONB,
    recovery_method VARCHAR(50),
    recovery_status VARCHAR(50),
    validation JSONB,
    provenance JSONB,
    confidence_score REAL,
    confidence_signals JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- artifact_observations (multiple engines seeing same artifact)
CREATE TABLE artifact_observations (
    id UUID PRIMARY KEY,
    artifact_id UUID REFERENCES artifacts(id),
    engine_name VARCHAR(50) NOT NULL,
    engine_data JSONB NOT NULL,
    source_offset BIGINT,
    source_inode BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- hashes
CREATE TABLE hashes (
    id UUID PRIMARY KEY,
    artifact_id UUID REFERENCES artifacts(id),
    algorithm VARCHAR(20) NOT NULL,
    value CHAR(64) NOT NULL,
    UNIQUE(artifact_id, algorithm)
);

-- timeline_events
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    artifact_id UUID REFERENCES artifacts(id),
    event_timestamp TIMESTAMP NOT NULL,
    timestamp_type VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    description TEXT,
    confidence REAL,
    provenance JSONB
);

-- correlations
CREATE TABLE correlations (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    correlation_group_id UUID NOT NULL,
    artifact_id UUID REFERENCES artifacts(id),
    correlation_reason VARCHAR(50) NOT NULL,
    match_confidence VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- reports
CREATE TABLE reports (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    report_number VARCHAR(50) UNIQUE NOT NULL,
    format VARCHAR(20) NOT NULL,
    file_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'generating',
    generated_at TIMESTAMP,
    generated_by UUID REFERENCES users(id)
);

-- audit_events
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    evidence_id UUID REFERENCES evidence(id),
    event_type VARCHAR(50) NOT NULL,
    actor VARCHAR(255),
    action TEXT,
    description TEXT,
    input_hash CHAR(64),
    output_hash CHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 7. Engine Adapter Interface

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional
from pathlib import Path

@dataclass
class EngineCapabilities:
    engine_name: str
    engine_version: str
    supported_filesystems: List[str]
    can_detect: bool
    can_analyze: bool
    can_recover: bool
    can_validate: bool

@dataclass
class Artifact:
    artifact_id: str
    case_id: str
    evidence_id: str
    artifact_type: str
    name: str
    path: Optional[str]
    filesystem: Optional[str]
    source: dict
    size: Optional[int]
    timestamps: dict
    hashes: dict
    recovery: dict
    validation: dict
    provenance: dict

class ForensicEngineAdapter(ABC):
    @property
    @abstractmethod
    def capabilities(self) -> EngineCapabilities: ...

    @abstractmethod
    async def detect(self, evidence_path: Path) -> bool: ...

    @abstractmethod
    async def analyze(self, evidence_path: Path, case_id: str, evidence_id: str) -> List[Artifact]: ...

    @abstractmethod
    async def recover(self, artifacts: List[Artifact], output_dir: Path) -> List[Artifact]: ...

    @abstractmethod
    async def validate(self, artifacts: List[Artifact]) -> List[Artifact]: ...

    @abstractmethod
    async def get_artifacts(self) -> List[Artifact]: ...
```

## 8. Testing Plan

| Level | Scope | Tools |
|-------|-------|-------|
| Unit | Schemas, normalization, hashing, provenance, correlation, confidence, services | pytest |
| Adapter | Command construction, parser, output normalization, failure handling | pytest + mock engines |
| Integration | Evidence → detection → engine → normalization → DB → report | pytest + test images |
| E2E | Upload → analysis → recovery → artifact → report | pytest + playwright (later) |

### Test Data Requirements
- Synthetic XFS image with known deleted files
- Synthetic Btrfs image with snapshots
- Mixed filesystem image for carving
- Known ground truth: file list, hashes, timestamps

## 9. Current Environment

| Component | Status | Version |
|-----------|--------|---------|
| Python | ✅ Available | 3.14.2 |
| Node.js | ✅ Available | 24.13.0 |
| npm | ✅ Available | 11.6.2 |
| Docker | ❌ Not installed | — |
| PostgreSQL | ❌ Not installed | — (use SQLite for dev) |
| Redis | ❌ Not installed | — (use in-memory queue for dev) |

**Note**: Docker unavailable; development uses SQLite and in-memory queue. Docker Compose created for future containerized deployment.

## 10. Current Blockers

1. **Docker not installed** — Cannot run PostgreSQL/Redis containers locally. Using SQLite + in-memory queue for development.
2. **No forensic engines available** — Mock adapters implemented (Phase 3).
3. **No test images** — Synthetic test data created in Phase 3.

## 11. Phase 2 Completion Summary

### Files Created (Phase 2)
- `backend/app/services/evidence_storage.py` - Evidence storage with streaming SHA-256
- `backend/app/services/filesystem_detector.py` - Signature-based filesystem detection
- `backend/app/services/hash_service.py` - Hash calculation and verification
- `backend/app/api/evidence.py` - Enhanced with verify, detect-filesystem endpoints
- `backend/app/schemas/evidence.py` - Added EvidenceVerifyResponse schema
- `backend/app/services/__init__.py` - Exports new services
- `backend/tests/test_phase2_services.py` - Service tests (13 tests)
- `backend/tests/test_evidence_api.py` - API tests (10 tests)
- `backend/tests/test_orchestrator_integrity.py` - Integrity blocking tests (4 tests)
- `frontend/app/dashboard/cases/[id]/page.tsx` - Case detail page with evidence management
- `frontend/app/dashboard/cases/[caseId]/evidence/[evidenceId]/page.tsx` - Evidence detail page

### Files Modified (Phase 2)
- `backend/app/orchestrator/service.py` - Added integrity check blocking
- `backend/app/services/__init__.py` - Exports new services
- `PROJECT_PLAN.md` - Updated phase status

### API Endpoints Added
- `POST /api/v1/cases/{case_id}/evidence/{evidence_id}/verify` - Verify evidence integrity
- `POST /api/v1/cases/{case_id}/evidence/{evidence_id}/detect-filesystem` - Detect filesystem type

### Database Changes
- Evidence model already supports: status (imported/verified/error), filesystem_type, sha256_hash
- AuditEvent model tracks: EVIDENCE_ADDED, HASH_CALCULATED, EVIDENCE_VERIFIED, EVIDENCE_INTEGRITY_FAILED, FILESYSTEM_DETECTED

### Test Commands
```bash
cd forensic-recovery-platform
python -m pytest backend/tests/ -v
```

### Evidence Storage Structure
```
evidence/
├── input/
│   └── <CASE_ID>/
│       └── <EVIDENCE_ID>/
│           └── original/
│               └── <original_filename>
├── working/
│   └── <CASE_ID>/
│       └── <EVIDENCE_ID>/
├── recovered/
│   └── <CASE_ID>/
│       └── <EVIDENCE_ID>/
├── artifacts/
│   └── <CASE_ID>/
│       └── <EVIDENCE_ID>/
└── reports/
    └── <CASE_ID>/
```

## 12. Next Steps (Phase 3)

1. Mock pipeline end-to-end flow
2. Mock XFS/Btrfs/Carving adapters (already created)
3. Orchestrator job queue with mock engines
4. Normalized artifact output
5. End-to-end mock flow test