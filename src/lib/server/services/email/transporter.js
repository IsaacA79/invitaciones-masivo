// src/lib/server/services/email/transporter.js
import nodemailer from 'nodemailer';
import { env as privateEnv } from '$env/dynamic/private';

const GMAIL_USER = (privateEnv.GMAIL_USER ?? '').trim();
const GMAIL_APP_PASSWORD = (privateEnv.GMAIL_APP_PASSWORD ?? '').trim();

if (!GMAIL_USER) throw new Error('Falta GMAIL_USER en variables de entorno.');
if (!GMAIL_APP_PASSWORD) throw new Error('Falta GMAIL_APP_PASSWORD en variables de entorno.');

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
});
