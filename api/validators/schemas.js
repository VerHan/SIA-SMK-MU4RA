import { z } from 'zod';
import { validateSafeWebhookUrl } from '../authUtils.js';

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_ROLE_ENUM = z.enum(['admin', 'guru', 'staff', 'kepsek', 'wali_murid']);

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi.').max(80, 'Username terlalu panjang.'),
  password: z.string().min(1, 'Password wajib diisi.').max(200, 'Password terlalu panjang.'),
  rememberMe: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi.'),
  newPassword: z.string().trim().min(8, 'Password baru minimal 8 karakter.').max(128, 'Password terlalu panjang.'),
});

export const userCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter.')
    .max(50, 'Username maksimal 50 karakter.')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.'),
  password: z.string().min(6, 'Password minimal 6 karakter.').max(128, 'Password maksimal 128 karakter.'),
  name: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter.').max(120, 'Nama terlalu panjang.'),
  role: VALID_ROLE_ENUM,
  isPiket: z.boolean().optional(),
  isActive: z.boolean().optional(),
  teacherId: z.string().trim().nullable().optional(),
  studentId: z.string().trim().nullable().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter.').max(120).optional(),
  role: VALID_ROLE_ENUM.optional(),
  password: z
    .string()
    .optional()
    .refine(val => !val || val.trim() === '' || val.length >= 6, {
      message: 'Password baru minimal 6 karakter.',
    }),
  isPiket: z.boolean().optional(),
  isActive: z.boolean().optional(),
  teacherId: z.string().trim().nullable().optional(),
  studentId: z.string().trim().nullable().optional(),
});

export const schoolConfigSchema = z
  .object({
    schoolName: z.string().trim().min(3, 'Nama sekolah minimal 3 karakter.').max(150).optional(),
    npsn: z.string().trim().max(30).nullable().optional(),
    principalName: z.string().trim().max(120).nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    email: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional()
      .refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Format email sekolah tidak valid.',
      }),
    jamMasuk: z.string().regex(HHMM_REGEX, 'Format jam masuk harus HH:MM (contoh: 07:00).').optional(),
    jamPulang: z.string().regex(HHMM_REGEX, 'Format jam pulang harus HH:MM (contoh: 15:30).').optional(),
    batasTelatMenit: z.coerce
      .number()
      .int('Batas telat harus bilangan bulat.')
      .min(0, 'Batas telat minimal 0 menit.')
      .max(180, 'Batas telat maksimal 180 menit.')
      .optional(),
    geofenceLat: z.coerce.number().min(-90).max(90).optional(),
    geofenceLng: z.coerce.number().min(-180).max(180).optional(),
    geofenceRadius: z.coerce.number().int().min(20, 'Radius minimal 20m.').max(2000, 'Radius maksimal 2000m.').optional(),
    whatsappEnabled: z.boolean().optional(),
    whatsappWebhookUrl: z.string().trim().max(500).nullable().optional(),
    notifyOnAlpha: z.boolean().optional(),
    notifyOnBolos: z.boolean().optional(),
    notifyHomeroom: z.boolean().optional(),
    notifyParent: z.boolean().optional(),
    dailyBackupEnabled: z.boolean().optional(),
    dailyBackupTime: z.string().regex(HHMM_REGEX, 'Format jadwal backup harus HH:MM (contoh: 02:00).').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.whatsappWebhookUrl) {
      const check = validateSafeWebhookUrl(data.whatsappWebhookUrl);
      if (!check.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['whatsappWebhookUrl'],
          message: check.error,
        });
      }
    }
  });

export const testWebhookSchema = z.object({
  webhookUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .superRefine((val, ctx) => {
      if (val) {
        const check = validateSafeWebhookUrl(val);
        if (!check.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: check.error,
          });
        }
      }
    }),
  sampleMessage: z.string().trim().max(400).optional(),
});

export const paymentCreateSchema = z.object({
  studentId: z.string().trim().min(1, 'Siswa wajib dipilih.'),
  type: z.string().trim().min(2, 'Jenis pembayaran wajib diisi.').max(80).default('SPP'),
  month: z.string().trim().min(2, 'Periode/bulan wajib diisi.').max(40),
  amount: z.coerce.number().int().min(1000, 'Nominal tagihan minimal Rp 1.000.').max(100000000),
  paid: z.coerce.number().int().min(0, 'Nominal terbayar tidak boleh negatif.').max(100000000).default(0),
  date: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine(val => !val || DATE_REGEX.test(val), { message: 'Format tanggal harus YYYY-MM-DD.' }),
});

export const paymentUpdateSchema = z.object({
  type: z.string().trim().min(2).max(80).optional(),
  month: z.string().trim().min(2).max(40).optional(),
  amount: z.coerce.number().int().min(1000).max(100000000).optional(),
  paid: z.coerce.number().int().min(0).max(100000000).optional(),
  status: z.enum(['lunas', 'cicilan', 'belum']).optional(),
  date: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine(val => !val || DATE_REGEX.test(val), { message: 'Format tanggal harus YYYY-MM-DD.' }),
});

export const prayerAttendanceBatchSchema = z.object({
  date: z.string().regex(DATE_REGEX, 'Format tanggal absen sholat harus YYYY-MM-DD.'),
  records: z
    .array(
      z.object({
        studentId: z.string().trim().min(1, 'studentId wajib diisi.'),
        dzuhur: z.boolean().default(false),
        ashar: z.boolean().default(false),
      })
    )
    .min(1, 'Minimal satu catatan absen sholat diperlukan.')
    .max(500, 'Maksimal 500 catatan dalam satu pengiriman.'),
});

export const rolloverExecuteSchema = z.object({
  sourceYearId: z.string().trim().min(1, 'Tahun ajar sumber wajib dipilih.'),
  targetYearId: z.string().trim().min(1, 'Tahun ajar tujuan wajib dipilih.'),
  mode: z.enum(['promote', 'semester']).default('promote'),
  mappings: z
    .array(
      z.object({
        sourceClassId: z.string().trim().min(1),
        targetClassId: z.string().trim().nullable().optional(),
        action: z.enum(['promote', 'keep', 'graduate', 'skip']),
      })
    )
    .default([]),
  retainStudentIds: z.array(z.string().trim()).default([]),
  excludedStudentIds: z.array(z.string().trim()).default([]),
  activateTargetYear: z.boolean().default(true),
});

export function formatZodError(error) {
  if (!error || !Array.isArray(error.issues) || error.issues.length === 0) {
    return 'Data input tidak valid.';
  }
  const first = error.issues[0];
  return first.message || 'Data input tidak valid.';
}

/**
 * Centralized Express middleware for strict Zod request body validation.
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: formatZodError(parsed.error),
        issues: parsed.error.issues.map(i => ({
          field: i.path.join('.') || 'body',
          message: i.message,
        })),
      });
    }
    req.validatedBody = parsed.data;
    next();
  };
}
