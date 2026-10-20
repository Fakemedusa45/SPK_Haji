from datetime import date
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship


# ─── Jamaah Haji ────────────────────────────────────────────────────────────

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


# ─── Kriteria & Sub-Kriteria ─────────────────────────────────────────────────

class KriteriaBase(SQLModel):
    kode: str = Field(max_length=10, description="Kode kriteria, misal C1")
    nama: str = Field(max_length=100, description="Nama kriteria")
    bobot: Optional[float] = Field(default=None, description="Bobot prioritas AHP (eigen vector Wj)")
    scope: str = Field(default="KAROM & KARU", max_length=50, description="Cakupan: KAROM & KARU atau Khusus KAROM")

class Kriteria(KriteriaBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sub_kriterias: List["SubKriteria"] = Relationship(back_populates="kriteria")

class KriteriaCreate(KriteriaBase):
    pass

class KriteriaRead(KriteriaBase):
    id: int


class SubKriteriaBase(SQLModel):
    kriteria_id: int = Field(foreign_key="kriteria.id")
    rentang_nilai: str = Field(max_length=200, description="Rentang nilai / label sub-kriteria")
    keterangan: str = Field(max_length=200, description="Keterangan (Sangat Ideal, Ideal, Cukup, dst)")
    skor: int = Field(description="Skor nilai 1-5")

class SubKriteria(SubKriteriaBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    kriteria: Optional[Kriteria] = Relationship(back_populates="sub_kriterias")

class SubKriteriaCreate(SubKriteriaBase):
    pass

class SubKriteriaRead(SubKriteriaBase):
    id: int

class KriteriaWithSubs(KriteriaRead):
    sub_kriterias: List[SubKriteriaRead] = []
