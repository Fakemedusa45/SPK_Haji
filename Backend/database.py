from sqlmodel import SQLModel, create_engine, Session

# Konfigurasi koneksi MySQL ke Laragon (port 3306)
# Default user: root, password: (kosong)
# Pastikan database 'spk_haji' sudah dibuat di phpMyAdmin / HeidiSQL
DATABASE_URL = "mysql+pymysql://root:@127.0.0.1:3306/spk_haji"

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    # Membuat tabel di database berdasarkan skema yang ada di SQLModel
    from models import JamaahHaji
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
