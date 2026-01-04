/**
 * gRPCプロキシエンドポイント: 車検証API
 * Cloud RunのgRPCサービスにgRPC-web-json形式でリクエストを転送
 */

import { getCloudRunIdToken } from '~/server/utils/cloudrun-auth';

type GrpcMethod =
  | 'listCurrent'
  | 'list'
  | 'get'
  | 'create'
  | 'delete'
  | 'listExpiredOrAboutToExpire'
  | 'listRenewTargets';

interface RequestBody {
  method: GrpcMethod;
  params?: Record<string, unknown>;
}

// gRPCメソッド名とパスのマッピング
const methodPaths: Record<GrpcMethod, string> = {
  listCurrent: '/logi.car_inspection.CarInspectionService/ListCurrentCarInspections',
  list: '/logi.car_inspection.CarInspectionService/ListCarInspections',
  get: '/logi.car_inspection.CarInspectionService/GetCarInspection',
  create: '/logi.car_inspection.CarInspectionService/CreateCarInspection',
  delete: '/logi.car_inspection.CarInspectionService/DeleteCarInspection',
  listExpiredOrAboutToExpire: '/logi.car_inspection.CarInspectionService/ListExpiredOrAboutToExpire',
  listRenewTargets: '/logi.car_inspection.CarInspectionService/ListRenewTargets',
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  if (!config.cloudrunUrl) {
    throw createError({
      statusCode: 500,
      message: 'Cloud Run URL is not configured',
    });
  }

  const body = await readBody<RequestBody>(event);

  if (!body.method || !methodPaths[body.method]) {
    throw createError({
      statusCode: 400,
      message: `Invalid method: ${body.method}`,
    });
  }

  try {
    // IAMトークンを取得
    const token = await getCloudRunIdToken(config.cloudrunUrl as string);

    const grpcUrl = `${config.cloudrunUrl}${methodPaths[body.method]}`;

    // gRPC-web-json形式でリクエスト
    const response = await fetch(grpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(body.params || {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('gRPC request failed:', response.status, errorText);
      throw createError({
        statusCode: response.status,
        message: `gRPC request failed: ${errorText}`,
      });
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('gRPC proxy error:', error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
