/* ============================================================
   TahunAjarPage — Master Data Tahun Ajar & Semester
   
   Fitur & UX:
   - Highlight Card Khusus untuk Tahun Ajar Aktif di Bagian Paling Atas
   - Info Lengkap Periode: Tanggal Mulai s/d Tanggal Selesai
   - Progress Bar & Countdown Hari Periode Berjalan
   - Quick Switch Semester & Tombol "Set Aktif" Sekali Klik
   - Riwayat & Daftar Tahun Ajar Non-Aktif Tertata Rapi di Bawah
   ============================================================ */

import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  getAcademicYears,
  addAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  setActiveAcademicYear,
} from '../../services/api';

/* Helper: Format Tanggal ke Bahasa Indonesia */
function formatIndoDate(dateStr) {
  if (!dateStr) return '-';
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length !== 3) return cleanStr;
  const [y, m, d] = parts;
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

/* Helper: Hitung Durasi & Progress Berjalan */
function calculatePeriodMetrics(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return null;
  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime();
  const now = new Date().getTime();

  if (isNaN(start) || isNaN(end) || end <= start) return null;

  const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  const totalMonths = Math.round(totalDays / 30);

  if (now < start) {
    const daysUntilStart = Math.max(1, Math.round((start - now) / (1000 * 60 * 60 * 24)));
    return {
      status: 'upcoming',
      badgeColor: 'warning',
      badgeText: `Dimulai ${daysUntilStart} hari lagi`,
      percent: 0,
      totalDays,
      totalMonths,
      summary: `Akan dimulai ${daysUntilStart} hari lagi (${totalDays} hari total)`
    };
  }

  if (now > end) {
    return {
      status: 'ended',
      badgeColor: 'default',
      badgeText: 'Periode Berakhir',
      percent: 100,
      totalDays,
      totalMonths,
      summary: `Periode telah selesai (${totalDays} hari)`
    };
  }

  const elapsedDays = Math.round((now - start) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24)));
  const percent = Math.min(100, Math.max(1, Math.round((elapsedDays / totalDays) * 100)));

  return {
    status: 'active',
    badgeColor: 'success',
    badgeText: 'Sedang Berlangsung',
    percent,
    totalDays,
    totalMonths,
    elapsedDays,
    remainingDays,
    summary: `Hari ke-${elapsedDays} dari ${totalDays} hari • Sisa ${remainingDays} hari (${percent}%)`
  };
}

export default function TahunAjarPage() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    nama: '',
    semester: 1,
    startDate: '',
    endDate: '',
    isActive: false
  });

  const fetchData = async () => {
    setLoading(true);
    const data = await getAcademicYears();
    setYears(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* Pisahkan Tahun Ajar Aktif & Daftar Lainnya */
  const activeYear = useMemo(() => {
    return years.find(y => y.isActive) || null;
  }, [years]);

  const inactiveYears = useMemo(() => {
    return years
      .filter(y => !y.isActive)
      .sort((a, b) => (b.nama || '').localeCompare(a.nama || '') || (b.semester - a.semester));
  }, [years]);

  /* Smart Auto-fill saat memilih semester di modal tambah */
  const handleSemesterChange = (newSemester) => {
    const sem = parseInt(newSemester, 10);
    setForm(prev => {
      // Jika nama tahun ajar ada misal "2025/2026", kita bisa suggest tanggal otomatis
      let sDate = prev.startDate;
      let eDate = prev.endDate;
      if (prev.nama && prev.nama.includes('/')) {
        const [y1, y2] = prev.nama.split('/').map(s => s.trim());
        if (sem === 1 && y1) {
          sDate = `${y1}-07-15`;
          eDate = `${y1}-12-20`;
        } else if (sem === 2 && (y2 || y1)) {
          const targetYear = y2 ? (y2.length === 2 ? `20${y2}` : y2) : y1;
          sDate = `${targetYear}-01-06`;
          eDate = `${targetYear}-06-20`;
        }
      }
      return {
        ...prev,
        semester: sem,
        startDate: sDate,
        endDate: eDate
      };
    });
  };

  const handleOpenAddModal = () => {
    setEditData(null);
    // Prediksi tahun ajaran berikutnya jika ada data
    let defaultNama = '2024/2025';
    let defaultSem = 1;
    let sDate = '2024-07-15';
    let eDate = '2024-12-20';

    if (activeYear && activeYear.nama) {
      if (activeYear.semester === 1) {
        defaultNama = activeYear.nama;
        defaultSem = 2;
        if (activeYear.nama.includes('/')) {
          const [y1, y2] = activeYear.nama.split('/').map(s => s.trim());
          const targetYear = y2 ? (y2.length === 2 ? `20${y2}` : y2) : y1;
          sDate = `${targetYear}-01-06`;
          eDate = `${targetYear}-06-20`;
        }
      } else {
        if (activeYear.nama.includes('/')) {
          const parts = activeYear.nama.split('/');
          if (parts.length === 2) {
            const n1 = parseInt(parts[0], 10);
            const n2 = parseInt(parts[1], 10);
            if (!isNaN(n1) && !isNaN(n2)) {
              defaultNama = `${n1 + 1}/${n2 + 1}`;
              sDate = `${n1 + 1}-07-15`;
              eDate = `${n1 + 1}-12-20`;
            }
          }
        }
        defaultSem = 1;
      }
    }

    setForm({
      nama: defaultNama,
      semester: defaultSem,
      startDate: sDate,
      endDate: eDate,
      isActive: false
    });
    setShowModal(true);
  };

  const handleEdit = (year) => {
    setEditData(year);
    setForm({
      nama: year.nama,
      semester: year.semester,
      startDate: year.startDate ? year.startDate.split('T')[0] : '',
      endDate: year.endDate ? year.endDate.split('T')[0] : '',
      isActive: Boolean(year.isActive)
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      setToast({ type: 'error', message: 'Tanggal mulai dan selesai harus diisi.' });
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setToast({ type: 'error', message: 'Tanggal selesai harus setelah tanggal mulai.' });
      return;
    }

    const payload = { ...form };
    const isEditing = Boolean(editData);
    const targetId = editData ? editData.id : `temp-${Date.now()}`;

    // Optimistic UI update: instantly update UI
    if (isEditing) {
      setYears(prev => prev.map(y => y.id === targetId ? { ...y, ...payload } : y));
    } else {
      setYears(prev => [
        {
          id: targetId,
          ...payload,
          totalSiswa: 0
        },
        ...prev
      ]);
    }
    setShowModal(false);
    setEditData(null);
    setToast({ type: 'success', message: 'Data tahun ajar berhasil disimpan!' });

    // Background sync to server
    const res = isEditing ? await updateAcademicYear(targetId, payload) : await addAcademicYear(payload);
    if (res && res.success === false) {
      setToast({ type: 'error', message: res.error || 'Gagal menyimpan data.' });
      fetchData();
    } else {
      const fresh = await getAcademicYears();
      if (Array.isArray(fresh)) setYears(fresh);
    }
  };

  const handleDelete = async (id, nama, semester) => {
    if (confirm(`Yakin ingin menghapus Tahun Ajar ${nama} Semester ${semester}?`)) {
      // Optimistic delete
      setYears(prev => prev.filter(y => y.id !== id));
      setToast({ type: 'success', message: 'Tahun ajar berhasil dihapus.' });

      const res = await deleteAcademicYear(id);
      if (res && res.success === false) {
        setToast({ type: 'error', message: res.error || 'Gagal menghapus tahun ajar.' });
        fetchData();
      }
    }
  };

  const handleSetActive = async (year) => {
    if (confirm(`Aktifkan Tahun Ajaran ${year.nama} - Semester ${year.semester} sebagai periode aktif sekolah?`)) {
      // Optimistic UI update: instantly switch active flag in state
      setYears(prev => prev.map(y => ({
        ...y,
        isActive: y.id === year.id
      })));
      setToast({
        type: 'success',
        message: `Tahun Ajaran ${year.nama} Semester ${year.semester} berhasil diaktifkan!`
      });

      const res = await setActiveAcademicYear(year.id);
      if (res && res.success === false) {
        setToast({ type: 'error', message: res.error || 'Gagal mengubah tahun ajar aktif.' });
        fetchData();
      }
    }
  };

  /* Metrics untuk Active Year */
  const activeMetrics = useMemo(() => {
    if (!activeYear) return null;
    return calculatePeriodMetrics(activeYear.startDate, activeYear.endDate);
  }, [activeYear]);

  return (
    <div style={{ animation: 'fadeIn 300ms ease', maxWidth: '1100px', margin: '0 auto' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-6)',
        flexWrap: 'wrap',
        gap: 'var(--space-4)'
      }}>
        <div>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-extrabold)',
            marginBottom: '4px'
          }}>
            Manajemen Tahun Ajaran & Semester
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Atur periode aktif kalender belajar mengajar, pembagian semester, dan arsip tahun akademik.
          </p>
        </div>
        <Button onClick={handleOpenAddModal}>
          Tambah Tahun Ajar
        </Button>
      </div>

      {loading ? (
        <Card padding="var(--space-8)">
          <LoadingSpinner message="Memuat data tahun ajar..." />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* ============================================================
              1. TAHUN AJAR AKTIF (HERO CARD DI PALING ATAS DENGAN WARNA KHUSUS)
              ============================================================ */}
          {activeYear ? (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)'
              }}>
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-bold)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.25)',
                    display: 'inline-block'
                  }} />
                  Tahun Ajaran Aktif Saat Ini (Default Sistem)
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  Digunakan untuk presensi, jadwal, dan nilai
                </span>
              </div>

              <Card style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.07) 0%, rgba(37, 99, 235, 0.05) 50%, rgba(255, 255, 255, 0.9) 100%)',
                border: '2px solid #10B981',
                boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.15), 0 8px 10px -6px rgba(16, 185, 129, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Visual Top Highlight Accent */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #10B981, #3B82F6)'
                }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  
                  {/* Row 1: Title, Badges & Quick Action */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-3)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      {/* Big S1 / S2 Icon */}
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: 'var(--radius-xl)',
                        background: 'linear-gradient(135deg, #059669, #10B981)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'var(--font-weight-extrabold)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.7rem', opacity: 0.9, lineHeight: 1 }}>SMT</span>
                        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{activeYear.semester}</span>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <h2 style={{
                            fontSize: 'var(--font-size-xl)',
                            fontWeight: 'var(--font-weight-extrabold)',
                            color: 'var(--color-text)',
                            margin: 0
                          }}>
                            Tahun Ajaran {activeYear.nama}
                          </h2>
                          <Badge variant="success" size="sm" style={{
                            background: '#D1FAE5',
                            color: '#065F46',
                            border: '1px solid #A7F3D0',
                            padding: '3px 10px'
                          }}>
                            Aktif Berjalan
                          </Badge>
                          <Badge variant="primary" size="sm">
                            Semester {activeYear.semester} ({activeYear.semester === 1 ? 'Ganjil' : 'Genap'})
                          </Badge>
                        </div>
                        <p style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                          marginTop: '4px',
                          marginBottom: 0
                        }}>
                          Periode operasional akademik berjalan seluruh kegiatan guru & siswa
                        </p>
                      </div>
                    </div>

                    {/* Action buttons for active year */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(activeYear)}
                      >
                        Edit Periode
                      </Button>
                    </div>
                  </div>

                  {/* Row 2: Detail Tanggal Mulai s/d Tanggal Selesai (INFO UTAMA) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--space-3)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    {/* Tanggal Mulai */}
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Tanggal Mulai
                      </div>
                      <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginTop: '2px' }}>
                        {formatIndoDate(activeYear.startDate)}
                      </div>
                    </div>

                    {/* Tanggal Selesai */}
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Tanggal Selesai (Akhir)
                      </div>
                      <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginTop: '2px' }}>
                        {formatIndoDate(activeYear.endDate)}
                      </div>
                    </div>

                    {/* Total Estimasi Durasi */}
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Durasi Periode
                      </div>
                      <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: '#059669', marginTop: '2px' }}>
                        {activeMetrics ? `${activeMetrics.totalMonths} Bulan (${activeMetrics.totalDays} Hari)` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Progress Bar Timeline */}
                  {activeMetrics && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(0,0,0,0.04)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 'var(--font-size-xs)',
                        marginBottom: '6px'
                      }}>
                        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>
                          Status Semester: {activeMetrics.summary}
                        </span>
                        <span style={{ fontWeight: 'var(--font-weight-bold)', color: '#059669' }}>
                          {activeMetrics.percent}%
                        </span>
                      </div>
                      {/* Bar track */}
                      <div style={{
                        height: '8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${activeMetrics.percent}%`,
                          background: 'linear-gradient(90deg, #10B981, #059669)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 500ms ease'
                        }} />
                      </div>
                    </div>
                  )}

                </div>
              </Card>
            </div>
          ) : (
            /* Warning jika belum ada yang diset aktif */
            <Card style={{
              background: '#FFFBEB',
              border: '1px solid #F59E0B',
              textAlign: 'center',
              padding: 'var(--space-6)'
            }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: '#92400E', margin: 0 }}>
                Belum Ada Tahun Ajaran yang Aktif
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: '#B45309', maxWidth: '500px', margin: '6px auto var(--space-4)' }}>
                Sistem membutuhkan satu tahun ajaran aktif untuk menghitung presensi, jadwal mata pelajaran, dan rekap nilai. Silakan klik tombol <b>"Set Sebagai Aktif"</b> pada salah satu tahun ajaran di bawah.
              </p>
            </Card>
          )}

          {/* ============================================================
              2. DAFTAR TAHUN AJAR LAINNYA / ARSIP
              ============================================================ */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)'
            }}>
              <h2 style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-bold)'
              }}>
                Riwayat & Pilihan Tahun Ajar Lainnya ({inactiveYears.length})
              </h2>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Tahun ajaran non-aktif / arsip sebelumnya
              </span>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {inactiveYears.map((year) => {
                const metrics = calculatePeriodMetrics(year.startDate, year.endDate);
                return (
                  <Card
                    key={year.id}
                    hover
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-4)',
                      flexWrap: 'wrap',
                      padding: 'var(--space-4) var(--space-5)',
                      border: '1px solid var(--color-border)',
                      transition: 'all 200ms ease'
                    }}
                  >
                    {/* Left: Info Tahun Ajar & Tanggal Mulai - Selesai */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flex: 1, minWidth: '280px' }}>
                      {/* S1/S2 Badge */}
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-lg)',
                        background: '#F1F5F9',
                        color: 'var(--color-text-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'var(--font-weight-bold)',
                        flexShrink: 0,
                        border: '1px solid var(--color-border)'
                      }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>SMT</span>
                        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{year.semester}</span>
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)', color: 'var(--color-text)' }}>
                            Tahun Ajaran {year.nama}
                          </span>
                          <Badge variant="default" size="xs">
                            Semester {year.semester} ({year.semester === 1 ? 'Ganjil' : 'Genap'})
                          </Badge>
                          {metrics && (
                            <Badge variant={metrics.badgeColor} size="xs">
                              {metrics.badgeText}
                            </Badge>
                          )}
                        </div>

                        {/* Info Tanggal Mulai s/d Selesai */}
                        <div style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-secondary)',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '6px'
                        }}>
                          <span><b>Mulai:</b> {formatIndoDate(year.startDate)}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span><b>Selesai:</b> {formatIndoDate(year.endDate)}</span>
                          {metrics && (
                            <>
                              <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                              <span style={{ color: 'var(--color-text-muted)' }}>({metrics.totalDays} hari)</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSetActive(year)}
                        style={{
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          border: 'none'
                        }}
                      >
                        Set Sebagai Aktif
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(year)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(year.id, year.nama, year.semester)}
                        style={{ color: 'var(--color-danger)' }}
                      >
                        Hapus
                      </Button>
                    </div>
                  </Card>
                );
              })}

              {inactiveYears.length === 0 && (
                <Card style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                    Tidak ada riwayat tahun ajar lainnya. Klik <b>"+ Tambah Tahun Ajar"</b> untuk membuat periode baru.
                  </p>
                </Card>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ============================================================
          MODAL FORM: TAMBAH / EDIT TAHUN AJAR
          ============================================================ */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditData(null); }}
          title={editData ? `Edit Tahun Ajar ${editData.nama}` : 'Tambah Tahun Ajar Baru'}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <Input
                label="Nama Tahun Ajar"
                placeholder="Contoh: 2024/2025"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                Format standar penulisan: TahunAwal/TahunAkhir (misal: 2024/2025)
              </span>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-1)'
              }}>
                Semester
              </label>
              <select
                value={form.semester}
                onChange={(e) => handleSemesterChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-sm)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
              >
                <option value={1}>Semester 1 (Ganjil) — Umumnya Juli s/d Desember</option>
                <option value={2}>Semester 2 (Genap) — Umumnya Januari s/d Juni</option>
              </select>
            </div>

            {/* Tanggal Mulai & Tanggal Selesai */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <Input
                  label="Tanggal Mulai"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
                {form.startDate && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'block', marginTop: '2px' }}>
                    {formatIndoDate(form.startDate)}
                  </span>
                )}
              </div>

              <div>
                <Input
                  label="Tanggal Selesai (Akhir)"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
                {form.endDate && (
                  <span style={{ fontSize: '0.75rem', color: '#DC2626', display: 'block', marginTop: '2px' }}>
                    {formatIndoDate(form.endDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Checkbox Jadikan Aktif */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <input
                type="checkbox"
                id="isActiveCheckbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#10B981', cursor: 'pointer' }}
              />
              <label htmlFor="isActiveCheckbox" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontWeight: 'var(--font-weight-medium)' }}>
                Jadikan sebagai Tahun Ajaran Aktif sekarang
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditData(null); }}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                {editData ? 'Simpan Perubahan' : 'Tambah Tahun Ajar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
