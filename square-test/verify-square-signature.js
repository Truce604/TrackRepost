import crypto from 'crypto';
import fs from 'fs';

const webhookSecret = 'PASTE_YOUR_SIGNATURE_KEY_HERE'; // e.g. glwDF/0VTionNOuKcuzM7b0Bnam7SXdGFlMKbSZF+gY=
const notificationUrl = 'https://trackrepost.com/api/square/webhook'; // this must match Square exactly

const body = fs.readFileSync('./square-payload.json', 'utf8');

const signatureBase = notificationUrl + body;
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(signatureBase)
  .digest('base64');

console.log('🔐 Expected Signature:', expectedSignature);
