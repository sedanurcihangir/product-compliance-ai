from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PAGE_COUNT = 30
MAX_EXTRACTED_TEXT_LENGTH = 100_000
PDF_MAGIC = b"%PDF-"


class PdfValidationError(Exception):
    """Raised when PDF upload/extraction fails validation."""

    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class PdfExtractionResult:
    page_count: int
    extracted_text: str
    truncated: bool


def validate_pdf_magic(data: bytes) -> None:
    if not data.startswith(PDF_MAGIC):
        raise PdfValidationError(
            "File is not a valid PDF (missing %PDF- header).",
            status_code=400,
        )


def validate_file_size(size: int) -> None:
    if size <= 0:
        raise PdfValidationError("Empty file is not allowed.", status_code=400)
    if size > MAX_FILE_SIZE_BYTES:
        raise PdfValidationError(
            f"PDF exceeds maximum size of {MAX_FILE_SIZE_BYTES} bytes.",
            status_code=413,
        )


def extract_pdf_text(data: bytes) -> PdfExtractionResult:
    validate_pdf_magic(data)
    validate_file_size(len(data))

    try:
        reader = PdfReader(BytesIO(data), strict=False)
    except PdfReadError as exc:
        raise PdfValidationError(
            "PDF could not be read. The file may be corrupted.",
            status_code=400,
        ) from exc
    except Exception as exc:  # noqa: BLE001 — surface as controlled validation error
        raise PdfValidationError(
            "PDF parsing failed.",
            status_code=400,
        ) from exc

    if getattr(reader, "is_encrypted", False):
        # Try empty password; otherwise reject.
        try:
            unlocked = reader.decrypt("")  # type: ignore[attr-defined]
            if unlocked == 0:
                raise PdfValidationError(
                    "Encrypted PDFs are not supported.",
                    status_code=400,
                )
        except PdfValidationError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise PdfValidationError(
                "Encrypted PDFs are not supported.",
                status_code=400,
            ) from exc

    page_count = len(reader.pages)
    if page_count <= 0:
        raise PdfValidationError("PDF has no pages.", status_code=400)
    if page_count > MAX_PAGE_COUNT:
        raise PdfValidationError(
            f"PDF exceeds maximum page count of {MAX_PAGE_COUNT}.",
            status_code=413,
        )

    parts: list[str] = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:  # noqa: BLE001
            text = ""
        cleaned = text.strip()
        if cleaned:
            parts.append(cleaned)

    combined = "\n\n".join(parts).strip()
    if not combined:
        raise PdfValidationError(
            "No extractable text found in PDF. Image-only PDFs are not supported.",
            status_code=400,
        )

    truncated = False
    if len(combined) > MAX_EXTRACTED_TEXT_LENGTH:
        combined = combined[:MAX_EXTRACTED_TEXT_LENGTH]
        truncated = True

    return PdfExtractionResult(
        page_count=page_count,
        extracted_text=combined,
        truncated=truncated,
    )
