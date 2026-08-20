/* ============================================================
   MobileNotifPage.jsx — Halaman Notifikasi
   Section sudah siap, konten akan dikembangkan kemudian
   ============================================================ */

const DUMMY_NOTIF = [
  { id: 1, icon: '📋', title: 'Jadwal UTS telah diperbarui', time: '5 menit lalu', read: false, color: '#7C3AED' },
  { id: 2, icon: '✅', title: 'Absen berhasil dicatat — Senin, 19 Agustus 2024', time: '2 jam lalu', read: false, color: '#059669' },
  { id: 3, icon: '📢', title: 'Rapat koordinasi guru hari Rabu pukul 13.00', time: '1 hari lalu', read: true, color: '#D97706' },
  { id: 4, icon: '📌', title: 'Pengingat: Input nilai semester ganjil', time: '2 hari lalu', read: true, color: '#0891B2' },
];

export default function MobileNotifPage() {
  return (
    <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Notifikasi
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
          {DUMMY_NOTIF.filter(n => !n.read).length} notifikasi belum dibaca
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {DUMMY_NOTIF.map(notif => (
          <div key={notif.id} style={{
            padding: '14px 16px',
            borderRadius: '16px',
            background: notif.read ? 'rgba(255, 255, 255, 0.8)' : 'rgba(124, 58, 237, 0.05)',
            border: `1px solid ${notif.read ? 'rgba(0,0,0,0.06)' : 'rgba(124, 58, 237, 0.2)'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              background: `${notif.color}22`,
              border: `1px solid ${notif.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>
              {notif.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '13px', fontWeight: notif.read ? 500 : 700,
                color: '#0F172A', margin: '0 0 4px',
                lineHeight: 1.4,
              }}>
                {notif.title}
              </p>
              <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                {notif.time}
              </p>
            </div>
            {!notif.read && (
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#7C3AED', flexShrink: 0, marginTop: '4px',
              }} />
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
