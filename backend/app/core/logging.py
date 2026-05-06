import logging
import sys


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configure and setup logging for the application."""
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
        force=True  # Override any existing configuration
    )
    
    # Configure uvicorn loggers specifically
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("psycopg2").setLevel(logging.WARNING)

    # Return application-specific logger
    return logging.getLogger("sapi3d")


# Singleton instance
logger = setup_logging()
