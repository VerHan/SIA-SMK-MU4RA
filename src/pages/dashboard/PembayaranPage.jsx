/* PembayaranPage — Pembayaran SPP & tracking kekurangan */

import { useState, useEffect } from 'react';
import { getPayments } from '../../services/api';
import { formatRupiah, formatDate } from '../../utils/helpers';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function PembayaranPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('semua');

  useEffect(() => {
    getPayments().then(data => { setPayments(data); setLoading(false); });
  }, []);

  const filteredPayments = filter === 'semua'
    ? payments
    : payments.filter(p => p.status === filter);

  /* Hitung ringkasan */
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.paid, 0);
  const totalRemaining = totalAmount - totalPaid;

  const statusBadge = (status) => {
    const map = {
      lunas: { variant: 'success', label: 'Lunas' },
      cicilan: { variant: 'warning', label: 'Cicilan' },
      belum: { variant: 'danger', label: 'Belum Bayar' },
    };
    const s = map[status] || map.belum;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const columns = [
    { header: 'Nama Siswa', accessor: 'studentName', cellStyle: { fontWeight: 'var(--font-weight-medium)' } },
    { header: 'Kelas', accessor: 'class' },
    { header: 'Bulan', accessor: 'month' },
    { header: 'Tagihan', render: (row) => formatRupiah(row.amount) },
    { header: 'Dibayar', render: (row) => (
      <span style={{ color: row.paid > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
        {formatRupiah(row.paid)}
      </span>
    )},
    { header: 'Kekurangan', render: (row) => {
      const remaining = row.amount - row.paid;
      return (
        <span style={{
          color: remaining > 0 ? 'var(--color-danger)' : 'var(--color-success)',
          fontWeight: 'var(--font-weight-semibold)',
        }}>
          {remaining > 0 ? formatRupiah(remaining) : '—'}
        </span>
      );
    }},
    { header: 'Status', render: (row) => statusBadge(row.status) },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-6)' }}>
        💰 Pembayaran SPP
      </h1>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        <Card hover style={{
          background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
          color: 'white',
          border: 'none',
        }}>
          <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, fontWeight: 'var(--font-weight-medium)' }}>
            Total Tagihan
          </div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
            {formatRupiah(totalAmount)}
          </div>
        </Card>
        <Card hover style={{
          background: 'linear-gradient(135deg, #10B981, #34D399)',
          color: 'white',
          border: 'none',
        }}>
          <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, fontWeight: 'var(--font-weight-medium)' }}>
            Total Terbayar
          </div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
            {formatRupiah(totalPaid)}
          </div>
        </Card>
        <Card hover style={{
          background: 'linear-gradient(135deg, #EF4444, #F87171)',
          color: 'white',
          border: 'none',
        }}>
          <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, fontWeight: 'var(--font-weight-medium)' }}>
            Total Kekurangan
          </div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
            {formatRupiah(totalRemaining)}
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
      }}>
        {[
          { key: 'semua', label: 'Semua' },
          { key: 'lunas', label: 'Lunas' },
          { key: 'cicilan', label: 'Cicilan' },
          { key: 'belum', label: 'Belum Bayar' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: filter === f.key ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
              background: filter === f.key ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filter === f.key ? 'white' : 'var(--color-text-secondary)',
              border: filter === f.key ? 'none' : '1px solid var(--color-border)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat data pembayaran..." />
        ) : (
          <Table columns={columns} data={filteredPayments} emptyMessage="Tidak ada data pembayaran." />
        )}
      </Card>
    </div>
  );
}
