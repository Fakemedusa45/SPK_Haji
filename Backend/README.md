# Backend SPK Haji

Backend ini dibangun menggunakan FastAPI dan menggunakan `uv` sebagai package manager.

## Cara Menjalankan Backend

### Opsi 1: Menggunakan `uv` (Rekomendasi)
Anda dapat langsung menjalankan server tanpa perlu mengaktifkan virtual environment secara manual dengan perintah berikut:

```bash
uv run uvicorn main:app --reload
```

### Opsi 2: Mengaktifkan Virtual Environment Manual
Jika Anda ingin mengaktifkan virtual environment (`.venv`) terlebih dahulu:

1. **Aktifkan Virtual Environment**:
   - Jika menggunakan **Git Bash**:
     ```bash
     source .venv/Scripts/activate
     ```
   - Jika menggunakan **PowerShell**:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - Jika menggunakan **Command Prompt (CMD)**:
     ```cmd
     .\.venv\Scripts\activate.bat
     ```

2. **Jalankan Server**:
   ```bash
   uvicorn main:app --reload
   ```

Backend akan berjalan pada `http://127.0.0.1:8000`. Anda juga dapat melihat dokumentasi API di `http://127.0.0.1:8000/docs`.





CARA MENJALANKAN FRONTEND DAN BACKEND

1. Jalankan Laragon terlebih dahulu
2. Buka terminal
3. cd Backend/
4. uv run uvicorn main:app --reload
5. Buka terminal
6. cd Frontend/
7. npm run dev

gunakan git bash

cara push ke github:
git add .
git commit -m "commit"
git push origin main