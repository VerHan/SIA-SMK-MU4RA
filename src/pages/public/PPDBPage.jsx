/* ============================================================
   PPDBPage.jsx — Formulir Pendaftaran Peserta Didik Baru (Online)
   Terintegrasi dengan Google Sheets & Auto-Email Gratis
   ============================================================ */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SCHOOL_INFO, JURUSAN_LIST } from '../../config/constants';
import { submitPPDB } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ScrollReveal from '../../components/shared/ScrollReveal';

export default function PPDBPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    nisn: '',
    gender: 'L',
    schoolOrigin: '',
    majorChoice: 'TKJ',
    phoneStudent: '',
    phoneParent: '',
    email: '',
    address: '',
    track: 'Reguler',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Nama lengkap wajib diisi');
      return;
    }
    if (!formData.phoneStudent.trim()) {
      setErrorMsg('Nomor WhatsApp aktif wajib diisi');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await submitPPDB(formData);
      if (res.success) {
        setResult(res.data);
      } else {
        setErrorMsg(res.error || 'Terjadi kesalahan saat mengirim pendaftaran.');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', paddingBottom: 'var(--space-16)' }}>
      {/* Header Banner */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
        color: 'white',
        padding: 'var(--space-12) var(--space-6)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <ScrollReveal animation="slide-left" duration={600}>
            <span style={{
              display: 'inline-block',
              padding: 'var(--space-1) var(--space-4)',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-3)',
            }}>
              🌟 Penerimaan Peserta Didik Baru (PPDB) 2025/2026
            </span>
          </ScrollReveal>

          <ScrollReveal animation="slide-right" duration={700} delay={100}>
            <h1 style={{
              fontSize: 'clamp(1.75rem, 4vw, var(--font-size-4xl))',
              fontWeight: 'var(--font-weight-extrabold)',
              marginBottom: 'var(--space-3)',
            }}>
              Daftar Online {SCHOOL_INFO.name}
            </h1>
          </ScrollReveal>

          <ScrollReveal animation="slide-up" duration={700} delay={200}>
            <p style={{ opacity: 0.9, maxWidth: '600px', margin: '0 auto', fontSize: 'var(--font-size-base)' }}>
              Mudah, cepat, dan transparan. Isi formulir pendaftaran secara online dari mana saja dan dapatkan nomor registrasi resmi.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Main Container */}
      <div style={{ maxWidth: '880px', margin: '-2rem auto 0', padding: '0 var(--space-6)', position: 'relative', zIndex: 2 }}>
        {/* Step Indicator */}
        <ScrollReveal animation="slide-up" duration={600} delay={150}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}>
            {[
              { step: '1', title: 'Isi Formulir', desc: 'Lengkapi biodata diri & jurusan' },
              { step: '2', title: 'Nomor Registrasi', desc: 'Dapatkan bukti pendaftaran resmi' },
              { step: '3', title: 'Verifikasi Berkas', desc: 'Bawa bukti pendaftaran ke sekolah' },
            ].map((s, idx) => (
              <div key={idx} style={{
                background: 'white',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-border-light)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary-surface)',
                  color: 'var(--color-primary)',
                  fontWeight: 'var(--font-weight-extrabold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)' }}>{s.title}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Pendaftaran Sukses Alert/Card */}
        {result ? (
          <ScrollReveal animation="zoom" duration={500}>
            <Card style={{
              background: '#F0FDF4',
              borderColor: '#86EFAC',
              padding: 'var(--space-8)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🎉</div>
              <h2 style={{ color: '#166534', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-2)' }}>
                Pendaftaran Berhasil Terkirim!
              </h2>
              <p style={{ color: '#15803D', fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-6)' }}>
                Terima kasih, <strong>{result.name}</strong>. Data Anda telah kami terima di sistem database PPDB.
              </p>

              {/* Registration Badge Box */}
              <div style={{
                background: 'white',
                border: '2px dashed #22C55E',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                maxWidth: '420px',
                margin: '0 auto var(--space-6)',
              }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nomor Pendaftaran Resmi Anda
                </div>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-extrabold)', color: '#15803D', margin: 'var(--space-2) 0' }}>
                  {result.regNumber}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: '#475569' }}>
                  Pilihan Jurusan: <strong>{result.majorChoice}</strong> ({result.track})
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: 'var(--space-3)',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}>
                <Button onClick={() => window.print()} style={{ background: '#166534' }}>
                  🖨️ Cetak / Simpan Bukti
                </Button>
                <Button variant="outline" onClick={() => { setResult(null); setFormData({ name: '', nisn: '', gender: 'L', schoolOrigin: '', majorChoice: 'TKJ', phoneStudent: '', phoneParent: '', email: '', address: '', track: 'Reguler' }); }}>
                  Daftarkan Siswa Lain
                </Button>
                <Button variant="ghost" onClick={() => navigate('/')}>
                  Kembali ke Beranda
                </Button>
              </div>
            </Card>
          </ScrollReveal>
        ) : (
          /* Formulir Input */
          <ScrollReveal animation="slide-up" duration={700}>
            <Card style={{ padding: 'var(--space-8)' }}>
              <div style={{ borderBottom: '1px solid var(--color-border-light)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)' }}>
                  Formulir Calon Peserta Didik
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Silakan lengkapi formulir di bawah ini dengan data yang benar.
                </p>
              </div>

              {errorMsg && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  marginBottom: 'var(--space-6)',
                }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
                {/* Jalur Pendaftaran & Jurusan */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                      Jalur Pendaftaran *
                    </label>
                    <select
                      name="track"
                      value={formData.track}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        background: 'white',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      <option value="Reguler">Jalur Reguler (Umum)</option>
                      <option value="Prestasi">Jalur Prestasi (Nilai / Olahraga / Seni)</option>
                      <option value="Kemitraan">Jalur Kemitraan / Warga Sekitar</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                      Pilihan Program Keahlian (Jurusan) *
                    </label>
                    <select
                      name="majorChoice"
                      value={formData.majorChoice}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        background: 'white',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {JURUSAN_LIST.map(j => (
                        <option key={j.id} value={j.shortName}>
                          {j.shortName} — {j.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Nama Lengkap & NISN */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                      Nama Lengkap Siswa *
                    </label>
                    <Input
                      name="name"
                      placeholder="Contoh: Ahmad Fadilah"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                      NISN (Nomor Induk Siswa Nasional)
                    </label>
                    <Input
                      name="nisn"
                      placeholder="10 digit nomor NISN"
                      value={formData.nisn}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Jenis Kelamin & Asal Sekolah */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                      Jenis Kelamin *
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-2)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                        <input
                          type="radio"
                          name="gender"
                          value="L"
                          checked={formData.gender === 'L'}
                          onChange={handleChange}
                        />
                        Laki-laki
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                        <input
                          type="radio"
                          name="gender"
                          value="P"
                          checked={formData.gender === 'P'}
                          onChange={handleChange}
                        />
                        Perempuan
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                      Sekolah Asal (SMP / MTs) *
                    </label>
                    <Input
                      name="schoolOrigin"
                      placeholder="Contoh: SMP Negeri 1 Bangsri"
                      value={formData.schoolOrigin}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Kontak WhatsApp & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                      No. WhatsApp Siswa *
                    </label>
                    <Input
                      name="phoneStudent"
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      value={formData.phoneStudent}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                      No. WhatsApp Orang Tua / Wali
                    </label>
                    <Input
                      name="phoneParent"
                      type="tel"
                      placeholder="Contoh: 081987654321"
                      value={formData.phoneParent}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Email (Untuk Auto-Send Bukti Pendaftaran) */}
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                    Email Aktif Siswa / Orang Tua
                  </label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="nama@gmail.com (bukti pendaftaran akan dikirim ke sini)"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                    💡 Bukti pendaftaran resmi dan panduan kelengkapan berkas akan dikirim ke alamat email ini.
                  </div>
                </div>

                {/* Alamat Rumah */}
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                    Alamat Tempat Tinggal
                  </label>
                  <textarea
                    name="address"
                    rows="3"
                    placeholder="Nama Desa, RT/RW, Kecamatan, Kabupaten"
                    value={formData.address}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Submit Button */}
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                      fontWeight: 'var(--font-weight-bold)',
                    }}
                  >
                    {loading ? 'Mengirim Pendaftaran...' : '🚀 Kirim Pendaftaran Sekarang'}
                  </Button>
                </div>
              </form>
            </Card>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}
