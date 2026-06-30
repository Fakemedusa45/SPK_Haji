from datetime import date
from sqlmodel import Session
from models import JamaahHaji
from database import engine, create_db_and_tables

def seed_data():
    # Pastikan tabel sudah dibuat terlebih dahulu
    create_db_and_tables()

    dummy_data = [
        JamaahHaji(
            no_porsi="1300456789",
            nama="Budi Santoso",
            jenis_kelamin="Laki-laki",
            pendidikan="S1",
            pekerjaan="Pegawai Negeri Sipil",
            status_haji="Belum",
            tanggal_lahir=date(1980, 5, 12),
            kesehatan="Sehat"
        ),
        JamaahHaji(
            no_porsi="1300456790",
            nama="Siti Aminah",
            jenis_kelamin="Perempuan",
            pendidikan="SMA",
            pekerjaan="Wiraswasta",
            status_haji="Belum",
            tanggal_lahir=date(1975, 8, 20),
            kesehatan="Istitha'ah"
        ),
        JamaahHaji(
            no_porsi="1300456791",
            nama="Agus Prayitno",
            jenis_kelamin="Laki-laki",
            pendidikan="S2",
            pekerjaan="Dosen",
            status_haji="Batal",
            tanggal_lahir=date(1965, 3, 10),
            kesehatan="Perlu Pendampingan"
        ),
        JamaahHaji(
            no_porsi="1300456792",
            nama="Dewi Sartika",
            jenis_kelamin="Perempuan",
            pendidikan="S1",
            pekerjaan="Guru",
            status_haji="Sudah",
            tanggal_lahir=date(1982, 11, 5),
            kesehatan="Sehat"
        ),
        JamaahHaji(
            no_porsi="1300456793",
            nama="Ahmad Dahlan",
            jenis_kelamin="Laki-laki",
            pendidikan="SMP",
            pekerjaan="Petani",
            status_haji="Belum",
            tanggal_lahir=date(1955, 1, 1),
            kesehatan="Resti"
        ),
    ]

    with Session(engine) as session:
        # Cek apakah data pertama sudah ada untuk menghindari duplikasi
        existing = session.get(JamaahHaji, "1300456789")
        if not existing:
            for jamaah in dummy_data:
                session.add(jamaah)
            session.commit()
            print("\nSeeding berhasil! Data dummy jamaah haji telah ditambahkan ke database.")
        else:
            print("\nData jamaah haji sudah ada di database, seeding dilewati untuk menghindari duplikasi.")

if __name__ == "__main__":
    print("Memulai proses seeding...")
    seed_data()
