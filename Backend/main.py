from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from database import create_db_and_tables, get_session
from models import JamaahHaji

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dijalankan saat aplikasi mulai (startup)
    create_db_and_tables()
    yield
    # Dijalankan saat aplikasi berhenti (shutdown)
    pass

app = FastAPI(lifespan=lifespan, title="SPK Haji API")

# Konfigurasi CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Mengizinkan semua origin (untuk development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello dari SPK Haji Backend!"}

@app.get("/jamaah-haji", response_model=List[JamaahHaji])
def read_jamaah_haji(session: Session = Depends(get_session)):
    # Mengambil semua data jamaah haji dari database
    jamaah_haji = session.exec(select(JamaahHaji)).all()
    return jamaah_haji
