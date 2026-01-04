/**
 * Cloud Run IAM認証ユーティリティ
 * Cloudflare Workers環境で動作するように、手動でJWTを生成してIDトークンを取得
 */

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface CachedToken {
  token: string;
  expiry: number;
}

// トークンキャッシュ
let cachedToken: CachedToken | null = null;

/**
 * Base64URL エンコード
 */
function base64UrlEncode(data: string): string {
  const base64 = btoa(data);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * ArrayBuffer を Base64URL にエンコード
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

/**
 * PEM形式の秘密鍵をCryptoKeyに変換
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // PEMヘッダー/フッターを削除
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  // Base64デコード
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // PKCS#8形式でインポート
  return await crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

/**
 * JWTを生成
 */
async function createJwt(
  serviceAccount: ServiceAccountKey,
  targetAudience: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1時間有効

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id,
  };

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
    target_audience: targetAudience,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // 署名を生成
  const privateKey = await importPrivateKey(serviceAccount.private_key);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(unsignedToken)
  );

  const encodedSignature = arrayBufferToBase64Url(signature);
  return `${unsignedToken}.${encodedSignature}`;
}

/**
 * Google OAuth2 Token APIからIDトークンを取得
 */
async function fetchIdToken(jwt: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch ID token: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { id_token: string };
  return data.id_token;
}

/**
 * Cloud Run用のIDトークンを取得（キャッシュ付き）
 */
export async function getCloudRunIdToken(targetAudience: string): Promise<string> {
  const now = Date.now();

  // キャッシュが有効な場合（有効期限5分前まで）
  if (cachedToken && cachedToken.expiry > now + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const config = useRuntimeConfig();

  if (!config.gcpServiceAccountKey) {
    throw new Error('GCP_SERVICE_ACCOUNT_KEY is not configured');
  }

  let serviceAccount: ServiceAccountKey;
  try {
    serviceAccount = JSON.parse(config.gcpServiceAccountKey as string);
  } catch (e) {
    throw new Error('Invalid GCP_SERVICE_ACCOUNT_KEY format');
  }

  // JWTを生成
  const jwt = await createJwt(serviceAccount, targetAudience);

  // IDトークンを取得
  const idToken = await fetchIdToken(jwt);

  // キャッシュ（55分有効）
  cachedToken = {
    token: idToken,
    expiry: now + 55 * 60 * 1000,
  };

  return idToken;
}

/**
 * キャッシュをクリア
 */
export function clearTokenCache(): void {
  cachedToken = null;
}
