import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [jamaah, setJamaah] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch data dari backend (pastikan URL port sesuai dengan server FastAPI Anda)
    axios.get('http://127.0.0.1:8000/jamaah-haji')
      .then(response => {
        setJamaah(response.data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Gagal mengambil data dari server. Pastikan server backend berjalan dan CORS telah dikonfigurasi.')
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Data Jamaah Haji</h1>
      
      {loading && <p style={{ textAlign: 'center' }}>Loading data...</p>}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      
      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f4f4f4', color: '#333' }}>
              <tr>
                <th>No. Porsi</th>
                <th>Nama</th>
                <th>Jenis Kelamin</th>
                <th>Pendidikan</th>
                <th>Pekerjaan</th>
                <th>Status Haji</th>
                <th>Tanggal Lahir</th>
                <th>Kesehatan</th>
              </tr>
            </thead>
            <tbody>
              {jamaah.length > 0 ? (
                jamaah.map((item) => (
                  <tr key={item.no_porsi}>
                    <td>{item.no_porsi}</td>
                    <td>{item.nama}</td>
                    <td>{item.jenis_kelamin}</td>
                    <td>{item.pendidikan}</td>
                    <td>{item.pekerjaan}</td>
                    <td>{item.status_haji}</td>
                    <td>{item.tanggal_lahir}</td>
                    <td>{item.kesehatan}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center' }}>Tidak ada data jamaah.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default App
