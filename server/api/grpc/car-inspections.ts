/**
 * gRPCプロキシエンドポイント: 車検証API
 * Cloud RunのgRPCサービスにConnect RPC (grpc-web) で接続
 */

import { create } from '@bufbuild/protobuf';
import {
  ListCarInspectionsRequestSchema,
  GetCarInspectionRequestSchema,
  DeleteCarInspectionRequestSchema,
  CreateCarInspectionRequestSchema,
  CarInspectionSchema,
} from '@yhonda-ohishi-pub-dev/logi-proto';
import { EmptySchema } from '@yhonda-ohishi-pub-dev/logi-proto';
import { getCarInspectionClient, clearGrpcClientCache } from '~/server/utils/grpc-client';
import { clearTokenCache } from '~/server/utils/cloudrun-auth';

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

export default defineEventHandler(async (event) => {
  const body = await readBody<RequestBody>(event);

  if (!body.method) {
    throw createError({
      statusCode: 400,
      message: 'Method is required',
    });
  }

  try {
    const startClient = Date.now();
    const client = await getCarInspectionClient();
    console.log(`[TIMING] getCarInspectionClient: ${Date.now() - startClient}ms`);
    const params = body.params || {};

    const startGrpc = Date.now();
    switch (body.method) {
      case 'listCurrent': {
        const response = await client.listCurrentCarInspections(create(EmptySchema, {}));
        console.log(`[TIMING] gRPC listCurrent: ${Date.now() - startGrpc}ms`);
        return {
          carInspections: response.carInspections,
          pagination: response.pagination,
        };
      }

      case 'list': {
        const request = create(ListCarInspectionsRequestSchema, {
          carIdFilter: params.carIdFilter as string | undefined,
          pagination: params.pagination as { page?: number; pageSize?: number } | undefined,
        });
        const response = await client.listCarInspections(request);
        return {
          carInspections: response.carInspections,
          pagination: response.pagination,
        };
      }

      case 'get': {
        const request = create(GetCarInspectionRequestSchema, {
          electCertMgNo: params.electCertMgNo as string,
          grantdateE: params.grantdateE as string,
          grantdateY: params.grantdateY as string,
          grantdateM: params.grantdateM as string,
          grantdateD: params.grantdateD as string,
        });
        const response = await client.getCarInspection(request);
        return {
          carInspection: response.carInspection,
        };
      }

      case 'create': {
        const carInspection = create(CarInspectionSchema, params.carInspection as Record<string, unknown>);
        const request = create(CreateCarInspectionRequestSchema, {
          carInspection,
        });
        const response = await client.createCarInspection(request);
        return {
          carInspection: response.carInspection,
        };
      }

      case 'delete': {
        const request = create(DeleteCarInspectionRequestSchema, {
          electCertMgNo: params.electCertMgNo as string,
          grantdateE: params.grantdateE as string,
          grantdateY: params.grantdateY as string,
          grantdateM: params.grantdateM as string,
          grantdateD: params.grantdateD as string,
        });
        await client.deleteCarInspection(request);
        return { success: true };
      }

      case 'listExpiredOrAboutToExpire': {
        const response = await client.listExpiredOrAboutToExpire(create(EmptySchema, {}));
        return {
          carInspections: response.carInspections,
          pagination: response.pagination,
        };
      }

      case 'listRenewTargets': {
        const response = await client.listRenewTargets(create(EmptySchema, {}));
        return {
          carInspections: response.carInspections,
          pagination: response.pagination,
        };
      }

      default:
        throw createError({
          statusCode: 400,
          message: `Invalid method: ${body.method}`,
        });
    }
  } catch (error) {
    console.error('gRPC proxy error:', error);

    // トークン期限切れの可能性がある場合はキャッシュをクリア
    if (error instanceof Error && error.message.includes('401')) {
      clearTokenCache();
      clearGrpcClientCache();
    }

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
