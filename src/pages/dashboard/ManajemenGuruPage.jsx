/* ============================================================
   ManajemenGuruPage — Halaman Khusus Admin
   Untuk mengatur akses (Wali Kelas, Piket, dll) dari setiap guru
   ============================================================ */

import { useState } from 'react';
import { MOCK_TEACHERS } from '../../services/mockData';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';

export default function ManajemenGuruPage() {
  const [teachers, setTeachers] = useState(
    // Kita tambahkan mock property duties secara lokal untuk prototype
    MOCK_TEACHERS.map(t => ({
      ...t,
      duties: t.duties || [],
    }))
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.nip.includes(searchTerm)
  );

  const toggleDuty = (teacherId, duty) => {
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        const hasDuty = t.duties.includes(duty);
        const newDuties = hasDuty 
          ? t.duties.filter(d => d !== duty) 
          : [...t.duties, duty];
        return { ...t, duties: newDuties };
      }
      return t;
    }));
    
    setToast({ type: 'success', message: 'Hak akses guru berhasil diperbarui.' });
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
            👥 Manajemen Guru & Hak Akses
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Pilih dan atur tugas tambahan guru untuk mengontrol akses menu mereka.
          </p>
        </div>
      </div>

      <Card>
        <div style={{ marginBottom: 'var(--space-4)', maxWidth: '400px' }}>
          <Input 
            placeholder="Cari nama atau NIP guru..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>NIP</th>
                <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Nama Guru</th>
                <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Mata Pelajaran</th>
                <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Hak Akses (Job Desk)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: 'var(--space-3)', fontFamily: 'monospace' }}>{teacher.nip}</td>
                  <td style={{ padding: 'var(--space-3)', fontWeight: 500 }}>{teacher.name}</td>
                  <td style={{ padding: 'var(--space-3)' }}>{teacher.subject}</td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Badge Statik: Semua Guru Otomatis Akses Absen GPS */}
                      <Badge variant="primary" size="sm">Guru Umum (GPS)</Badge>
                      
                      {/* Toggle: Wali Kelas */}
                      <Badge 
                        variant={teacher.duties.includes('wali_kelas') ? 'success' : 'outline'} 
                        size="sm"
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => toggleDuty(teacher.id, 'wali_kelas')}
                        title="Klik untuk mengaktifkan/menonaktifkan akses menu Wali Kelas"
                      >
                        {teacher.duties.includes('wali_kelas') ? '✅ Wali Kelas' : '+ Wali Kelas'}
                      </Badge>

                      {/* Toggle: Guru Piket */}
                      <Badge 
                        variant={teacher.duties.includes('piket') ? 'warning' : 'outline'} 
                        size="sm"
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => toggleDuty(teacher.id, 'piket')}
                        title="Klik untuk mengaktifkan/menonaktifkan akses Absensi Harian (Piket)"
                      >
                        {teacher.duties.includes('piket') ? '✅ Piket' : '+ Piket'}
                      </Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTeachers.length === 0 && (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Tidak ada data guru yang ditemukan.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
