"""List records from scraperdb.results table."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models import Result
from app.schemas.result import ResultResponse

router = APIRouter(prefix="/results", tags=["Results"])


@router.get("", response_model=list[ResultResponse])
def list_results(
    db: Session = Depends(get_db),
    with_email_only: bool = Query(False, description="If true, only rows where email IS NOT NULL and not empty"),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
):
    """Get all records from the results table (scraperdb)."""
    q = db.query(Result)
    if with_email_only:
        q = q.filter(Result.email.isnot(None), Result.email != "")
    return q.order_by(Result.id).offset(skip).limit(limit).all()
