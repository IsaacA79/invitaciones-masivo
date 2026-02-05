// src/lib/server/services/email/transporter.js
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

const GMAIL_USER = env.GMAIL_USER;
const GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;

if (!GMAIL_USER) throw new Error('Falta GMAIL_USER');
if (!GMAIL_APP_PASSWORD) throw new Error('Falta GMAIL_APP_PASSWORD');

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
});
