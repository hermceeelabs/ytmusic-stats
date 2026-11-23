import sys
from pathlib import Path

# Add backend directory to Python path so Vercel's /api/index function can import main.app
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402, F401
