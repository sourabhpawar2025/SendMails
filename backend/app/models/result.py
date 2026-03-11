"""Result model - recipients from existing results table."""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=True)
    link = Column(String(512), nullable=True)
    email = Column(String(255), nullable=False, index=True)
    phones = Column(String(255), nullable=True)
    instagram = Column(String(255), nullable=True)
    facebook = Column(String(255), nullable=True)
    twitter = Column(String(255), nullable=True)
    category = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
