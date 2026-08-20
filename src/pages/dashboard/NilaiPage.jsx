/* NilaiPage — Kelola nilai siswa */

import { useState, useEffect } from 'react';
import { getGrades } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function NilaiPage() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('Semua');

  const subjects = ['Semua', 'Matematika', 'Pemrograman Web', 'Jaringan Komputer', 'Bahasa Indonesia', 'Bahasa Inggris', 'PAI'];

  useEffect(() => {
    getGrades().then(data => { setGrades(data); setLoading(false); });
  }, []);

  const filteredGrades = selectedSubject === 'Semua'
    ? grades
    : grades.filter(g => g.subject === selectedSubject);

  /* Tentukan badge warna berdasarkan skor */
  const scoreBadge = (score) => {
    if (score >= 85) return <Badge variant="success">{score}</Badge>;
    if (score >= 75) return <Badge variant="primary">{score}</Badge>;
    if (score >= 65) return <Badge variant="warning">{score}</Badge>;
    return <Badge variant="danger">{score}</Badge>;
  };

  const columns = [
    { header: 'No', render: (_, i) => i + 1, cellStyle: { width: '50px', textAlign: 'center' } },
    { header: 'Nama Siswa', accessor: 'studentName', cellStyle: { fontWeight: 'var(--font-weight-medium)' } },
    { header: 'Kelas', accessor: 'class' },
    { header: 'Mata Pelajaran', accessor: 'subject' },
    { header: 'Jenis', accessor: 'type' },
    { header: 'Nilai', render: (row) => scoreBadge(row.score) },
  ];

  /* Hitung rata-rata */
  const avgScore = filteredGrades.length > 0
    ? Math.round(filteredGrades.reduce((sum, g) => sum + g.score, 0) / filteredGrades.length)
    : 0;

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-6)' }}>
        📈 Nilai Siswa
      </h1>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        <Card hover style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)' }}>
            Rata-rata Nilai
          </div>
          <div style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-extrabold)',
            color: avgScore >= 75 ? 'var(--color-success)' : 'var(--color-warning)',
          }}>
            {avgScore}
          </div>
        </Card>
        <Card hover style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)' }}>
            Nilai Tertinggi
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', color: 'var(--color-success)' }}>
            {filteredGrades.length > 0 ? Math.max(...filteredGrades.map(g => g.score)) : '-'}
          </div>
        </Card>
        <Card hover style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)' }}>
            Nilai Terendah
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', color: 'var(--color-danger)' }}>
            {filteredGrades.length > 0 ? Math.min(...filteredGrades.map(g => g.score)) : '-'}
          </div>
        </Card>
        <Card hover style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)' }}>
            Total Data
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', color: 'var(--color-primary)' }}>
            {filteredGrades.length}
          </div>
        </Card>
      </div>

      {/* Subject Filter */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
      }}>
        {subjects.map(subject => (
          <button
            key={subject}
            onClick={() => setSelectedSubject(subject)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: selectedSubject === subject ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
              background: selectedSubject === subject ? 'var(--color-primary)' : 'var(--color-surface)',
              color: selectedSubject === subject ? 'white' : 'var(--color-text-secondary)',
              border: selectedSubject === subject ? 'none' : '1px solid var(--color-border)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {subject}
          </button>
        ))}
      </div>

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat data nilai..." />
        ) : (
          <Table columns={columns} data={filteredGrades} emptyMessage="Tidak ada data nilai." />
        )}
      </Card>
    </div>
  );
}
