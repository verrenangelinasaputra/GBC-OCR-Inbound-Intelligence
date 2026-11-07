import nodemailer from "nodemailer";

const DEFAULT_FROM = "nomarcengkareng@gmail.com";

export function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()
  );
}

export function mailFrom(): string {
  return process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || DEFAULT_FROM;
}

export function adminNotifyEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL?.trim() || DEFAULT_FROM;
}

function transporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function verificationEmailText(purpose: "register" | "reset_password", code: string, username: string): string {
  const action =
    purpose === "register"
      ? "menyelesaikan pendaftaran portal supplier GBC"
      : "mengatur ulang password portal supplier GBC";
  return `Kode verifikasi Anda: ${code}

Username: ${username}

Gunakan kode ini untuk ${action}.
Kode berlaku 15 menit. Jangan bagikan kode ini kepada siapa pun.

— GBC Supplier Portal
Dikirim dari ${mailFrom()}`;
}

export function newSupplierNotifyText(params: {
  supplierName: string;
  contactName: string;
  username: string;
  email: string;
  phone: string;
}): string {
  return `Supplier baru selesai verifikasi email di portal GBC.

Perusahaan: ${params.supplierName}
Kontak: ${params.contactName}
Username: ${params.username}
Email: ${params.email}
Telepon: ${params.phone}

Akun sudah ACTIVE di spreadsheet Supplier Credentials.

— GBC Supplier Portal`;
}

export async function sendMail(opts: { to: string; subject: string; text: string }): Promise<{ dev: boolean }> {
  const to = opts.to.trim();
  if (!to) throw new Error("Email tujuan wajib diisi.");

  const devLog = process.env.MAIL_DEV_LOG === "true" || !smtpConfigured();
  if (devLog && process.env.NODE_ENV !== "production") {
    console.log("[mail:dev]", { from: mailFrom(), to, subject: opts.subject, text: opts.text });
    if (!smtpConfigured()) return { dev: true };
  }

  if (!smtpConfigured()) {
    throw new Error(
      "Email belum dikonfigurasi. Set SMTP_HOST=smtp.gmail.com, SMTP_USER=nomarcengkareng@gmail.com, dan SMTP_PASS (App Password Gmail)."
    );
  }

  await transporter().sendMail({
    from: mailFrom(),
    to,
    subject: opts.subject,
    text: opts.text,
    html: opts.text.replace(/\n/g, "<br>"),
  });
  return { dev: false };
}
