"""FastAPI application entrypoint."""
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.api.routes import api_router

settings = get_settings()
app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Return 500 with detail so we can see the real error in the browser/console."""
    tb = traceback.format_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "traceback": tb.split("\n"),
        },
    )


@app.get("/health")
def health():
    return {"status": "ok"}
