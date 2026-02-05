// import nodemailer from 'nodemailer';
// import {
//   SMTP_HOST,
//   SMTP_PORT,
//   SMTP_USER,
//   SMTP_PASS,
//   SMTP_FROM
// } from '$env/static/private';

// export function getTransporter() {
//   const host = (SMTP_HOST || '').trim();
//   const port = Number(SMTP_PORT || 587);
//   const user = (SMTP_USER || '').trim();
//   const pass = (SMTP_PASS || '').trim();

//   if (!host || !user || !pass) {
//     throw new Error('Faltan variables SMTP_HOST/SMTP_USER/SMTP_PASS en .env');
//   }

//   return nodemailer.createTransport({
//     host,
//     port,
//     secure: false,
//     auth: { user, pass }
//   });
// }

// export function getFrom() {
//   return (SMTP_FROM || '').trim() || 'Invitaciones <no-reply@example.com>';
// }


import nodemailer from 'nodemailer';
import { GMAIL_USER, GMAIL_APP_PASSWORD } from '$env/static/private';

// Gmail SMTP
export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // 465 = TLS directo
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  }
});

// opcional: verifica conexión al arrancar (solo en dev)
// await transporter.verify();
