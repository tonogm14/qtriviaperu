import https from 'https';
import crypto from 'crypto';

const CULQI_SECRET_KEY = process.env.CULQI_SECRET_KEY ?? '';
// CULQI_PUBLIC_KEY is reserved for future client-side tokenization flows
const _CULQI_PUBLIC_KEY = process.env.CULQI_PUBLIC_KEY ?? '';
const CULQI_BASE = 'https://api.culqi.com/v2';

export function culqiEnabled(): boolean {
  return !!(CULQI_SECRET_KEY && CULQI_SECRET_KEY.startsWith('sk_'));
}

async function culqiPost<T>(path: string, body: object): Promise<T> {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(`${CULQI_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(
              (parsed as any)?.user_message ??
              (parsed as any)?.merchant_message ??
              `Culqi error ${res.statusCode}`
            ));
          } else {
            resolve(parsed as T);
          }
        } catch {
          reject(new Error('Culqi: respuesta inválida'));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export interface CulqiOrder {
  id: string;
  state: string;
  checkout_url: string;
  amount: number;
  currency_code: string;
}

export async function createCulqiOrder(params: {
  amountSoles: number;
  orderNumber: string;
  description: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<CulqiOrder> {
  const amountCentavos = Math.round(params.amountSoles * 100);
  const expirationDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  return culqiPost<CulqiOrder>('/orders', {
    amount: amountCentavos,
    currency_code: 'PEN',
    description: params.description,
    order_number: params.orderNumber,
    client_details: {
      first_name: params.firstName,
      last_name: params.lastName || '-',
      email: params.email,
      phone_number: params.phone,
    },
    expiration_date: expirationDate,
    confirm: false,
    metadata: { orderNumber: params.orderNumber },
  });
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!CULQI_SECRET_KEY) return false;
  const expected = crypto
    .createHmac('sha256', CULQI_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
