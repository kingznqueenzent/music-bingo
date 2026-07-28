"""
ASGI entry for a short uvicorn command (from this directory):

    uvicorn main:app --reload
"""
from app.main import app

__all__ = ["app"]
