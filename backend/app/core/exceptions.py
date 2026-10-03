from typing import Any

from fastapi import HTTPException, status


class ForensicException(Exception):
    """Base exception for forensic platform."""

    def __init__(
        self,
        message: str,
        code: str = "FORENSIC_ERROR",
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)


class EvidenceNotFoundError(ForensicException):
    def __init__(self, evidence_id: str):
        super().__init__(
            message=f"Evidence not found: {evidence_id}",
            code="EVIDENCE_NOT_FOUND",
            details={"evidence_id": evidence_id},
        )


class CaseNotFoundError(ForensicException):
    def __init__(self, case_id: str):
        super().__init__(
            message=f"Case not found: {case_id}",
            code="CASE_NOT_FOUND",
            details={"case_id": case_id},
        )


class AnalysisJobError(ForensicException):
    def __init__(self, job_id: str, message: str):
        super().__init__(
            message=f"Analysis job error: {message}",
            code="ANALYSIS_JOB_ERROR",
            details={"job_id": job_id, "error": message},
        )


class EngineExecutionError(ForensicException):
    def __init__(self, engine: str, message: str, exit_code: int | None = None):
        super().__init__(
            message=f"Engine {engine} execution failed: {message}",
            code="ENGINE_EXECUTION_ERROR",
            details={"engine": engine, "error": message, "exit_code": exit_code},
        )


class ValidationError(ForensicException):
    def __init__(self, field: str, message: str):
        super().__init__(
            message=f"Validation error for {field}: {message}",
            code="VALIDATION_ERROR",
            details={"field": field, "error": message},
        )


class IntegrityError(ForensicException):
    """Raised when evidence integrity is compromised."""
    def __init__(self, evidence_id: str, expected: str, actual: str):
        super().__init__(
            message=f"Integrity check failed for evidence {evidence_id}",
            code="INTEGRITY_ERROR",
            details={"evidence_id": evidence_id, "expected_hash": expected, "actual_hash": actual},
        )


def forensic_exception_to_http(exc: ForensicException) -> HTTPException:
    status_map = {
        "EVIDENCE_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "CASE_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "ANALYSIS_JOB_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "ENGINE_EXECUTION_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "VALIDATION_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "INTEGRITY_ERROR": status.HTTP_409_CONFLICT,
        "FORENSIC_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    return HTTPException(
        status_code=status_map.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR),
        detail={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
    )
