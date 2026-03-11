"""Query model - independent from email sending."""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Query(Base):
    __tablename__ = "queries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    query = Column(String(512), nullable=False)
    status = Column(String(64), nullable=True)  # pending, completed
    result_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
