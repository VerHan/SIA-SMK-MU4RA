/* ============================================================
   PembayaranPage — Manajemen Pembayaran SPP (API-Backed)
   ============================================================ */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPayments, createPayment, updatePayment, getStudents } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/ui/Table';

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val) || 0);
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';

export default function PembayaranPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [newForm, setNewForm] = useState({
    studentId: '',
    type: 'SPP',
    month: 'Agustus',
    amount: 150000,
    paid: 0,
  });

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const { data: paymentsRes, isLoading } = useQuery({
    queryKey: ['payments', filterStatus, search],
    queryFn: () => getPayments({ status: filterStatus, search }),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-payment-select'],
    queryFn: () => getStudents(),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => createPayment(payload),
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        setIsAddOpen(false);
        setNewForm({ studentId: '', type: 'SPP', month: 'Agustus', amount: 150000, paid: 0 });
        setToast({ type: 'success', message: res.message || 'Tagihan berhasil ditambahkan.' });
      } else {
        setToast({ type: 'error', message: res?.error || 'Gagal menambahkan tagihan.' });
      }
    },
  });

  const settleMutation = useMutation({
    mutationFn: ({ id, amount }) => updatePayment(id, { paid: amount, status: 'lunas' }),
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        setToast({ type: 'success', message: res.message || 'Pembayaran ditandai lunas.' });
      } else {
        setToast({ type: 'error', message: res?.error || 'Gagal memperbarui pembayaran.' });
      }
    },
  });

  const payments = paymentsRes?.data || [];
  const summary = paymentsRes?.summary || {
    totalTagihan: 0,
    totalTerbayar: 0,
    totalTunggakan: 0,
    countLunas: 0,
    countCicilan: 0,
    countBelum: 0,
  };

  const columns = [
    { key: 'studentName', label: 'Nama Siswa', sortable: true },
    { key: 'class', label: 'Kelas', sortable: true, width: '110px' },
    { key: 'type', label: 'Jenis', width: '90px' },
    { key: 'month', label: 'Bulan', width: '110px' },
    {
      key: 'amount',
      label: 'Tagihan',
      width: '125px',
      render: (val) => formatCurrency(val),
    },
    {
      key: 'paid',
      label: 'Terbayar',
      width: '125px',
      render: (val) => formatCurrency(val),
    },
    {
      key: 'status',
      label: 'Status',
      width: '136px',
      render: (val) => {
        const map = {
          lunas: { label: 'Lunas', variant: 'success' },
          cicilan: { label: 'Cicilan', variant: 'warning' },
          belum: { label: 'Belum Bayar', variant: 'danger' },
        };
        const st = map[val] || { label: val, variant: 'neutral' };
        return (
          <span style={{ whiteSpace: 'nowrap', display: 'inline-flex' }}>
            <Badge variant={st.variant} dot>{st.label}</Badge>
          </span>
        );
      },
    },
    { key: 'date', label: 'Tgl Bayar', width: '115px', render: (val) => val || '-' },
    ...(canManage
      ? [
          {
            key: 'actions',
            label: 'Aksi',
            width: '110px',
            render: (_, row) =>
              row.status !== 'lunas' ? (
                <Button
                  size="xs"
                  variant="secondary"
                  loading={settleMutation.isPending}
                  onClick={() => settleMutation.mutate({ id: row.id, amount: row.amount })}
                >
                  Lunasi
                </Button>
              ) : (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Selesai</span>
              ),
          },
        ]
      : []),
  ];

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      studentId: newForm.studentId,
      type: newForm.type,
      month: newForm.month,
      amount: Number(newForm.amount),
      paid: Number(newForm.paid),
    });
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-1)' }}>
            Pembayaran & Keuangan Siswa
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Pantau status pembayaran SPP dan tagihan siswa secara terpusat melalui backend API.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsAddOpen(true)}>+ Tambah Tagihan</Button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
            Total Tagihan
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-text)' }}>
            {formatCurrency(summary.totalTagihan)}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {payments.length} transaksi tercatat
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
            Total Terbayar
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-success)' }}>
            {formatCurrency(summary.totalTerbayar)}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {summary.countLunas} lunas
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
            Sisa Tunggakan
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-danger)' }}>
            {formatCurrency(summary.totalTunggakan)}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {summary.countBelum + summary.countCicilan} belum lunas
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'Semua' },
            { value: 'lunas', label: 'Lunas' },
            { value: 'cicilan', label: 'Cicilan' },
            { value: 'belum', label: 'Belum Bayar' },
          ].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterStatus(f.value)}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                border: filterStatus === f.value ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: filterStatus === f.value ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filterStatus === f.value ? '#FFFFFF' : 'var(--color-text-secondary)',
                fontWeight: 600,
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Cari nama siswa atau bulan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-sm)',
            minWidth: '220px',
          }}
        />
      </div>

      <DataTable columns={columns} data={payments} loading={isLoading} searchable={false} />

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tambah Tagihan Pembayaran" size="md">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: '6px' }}>
              Pilih Siswa *
            </label>
            <select
              required
              value={newForm.studentId}
              onChange={(e) => setNewForm(prev => ({ ...prev, studentId: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <option value="">— Pilih siswa —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.class})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Jenis Tagihan *"
              value={newForm.type}
              onChange={(e) => setNewForm(prev => ({ ...prev, type: e.target.value }))}
              required
            />
            <Input
              label="Bulan / Periode *"
              value={newForm.month}
              onChange={(e) => setNewForm(prev => ({ ...prev, month: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Nominal Tagihan (Rp) *"
              type="number"
              min="1000"
              value={newForm.amount}
              onChange={(e) => setNewForm(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
            <Input
              label="Nominal Terbayar (Rp)"
              type="number"
              min="0"
              value={newForm.paid}
              onChange={(e) => setNewForm(prev => ({ ...prev, paid: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button type="submit" loading={createMutation.isPending}>Simpan Tagihan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
