/**
 * Connect RPC クライアントユーティリティ
 * Cloud RunのgRPCサービスにConnect Protocol (grpc-web) で接続
 */

import { createClient, type Client } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { CarInspectionService } from '@yhonda-ohishi-pub-dev/logi-proto';
import { getCloudRunIdToken } from './cloudrun-auth';

/**
 * CarInspectionService用のConnect RPCクライアントを取得
 * 毎回新しいトークンでトランスポートを作成（トークンは内部でキャッシュされる）
 */
export async function getCarInspectionClient(): Promise<Client<typeof CarInspectionService>> {
  const config = useRuntimeConfig();
  const baseUrl = config.cloudrunUrl as string;

  if (!baseUrl) {
    throw new Error('Cloud Run URL is not configured');
  }

  // IAMトークンを取得（内部でキャッシュされる）
  const token = await getCloudRunIdToken(baseUrl);

  // gRPC-Web トランスポートを作成
  const transport = createGrpcWebTransport({
    baseUrl,
    // 認証ヘッダーを追加するインターセプター
    interceptors: [
      (next) => async (req) => {
        req.header.set('Authorization', `Bearer ${token}`);
        return next(req);
      },
    ],
  });

  // クライアントを作成
  return createClient(CarInspectionService, transport);
}

/**
 * クライアントキャッシュをクリア（互換性のために残す）
 */
export function clearGrpcClientCache(): void {
  // トランスポートはリクエストごとに作成されるため、特に処理不要
}
