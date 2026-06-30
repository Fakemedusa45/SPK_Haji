from datetime import date
from typing import Optional
from sqlmodel import Field, SQLModel

class JamaahHajiBase(SQLModel):
    nama: str = Field(max_length=100, description="Nama lengkap jamaah")
    jenis_kelamin: str = Field(max_length=20, description="Laki-laki / Perempuan")
    pendidikan: str = Field(max_length=100, description="Pendidikan terakhir")
    pekerjaan: str = Field(max_length=100, description="Pekerjaan")
    status_haji: str = Field(max_length=50, description="Status Haji (misal: Belum, Sudah, Batal, dll)")
    tanggal_lahir: date = Field(description="Tanggal Lahir")
    kesehatan: str = Field(max_length=200, description="Status Kesehatan (misal: Sehat, Istitha'ah, dll)")

class JamaahHaji(JamaahHajiBase, table=True):
    no_porsi: str = Field(primary_key=True, max_length=50, description="Nomor Porsi Haji")
