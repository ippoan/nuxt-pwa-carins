/**
 * gRPCプロキシエンドポイント: ファイルAPI
 * Cloud RunのgRPCサービスにConnect RPC (grpc-web) で接続
 */

import { create } from '@bufbuild/protobuf';
import {
  ListFilesRequestSchema,
  GetFileRequestSchema,
  DeleteFileRequestSchema,
  RestoreFileRequestSchema,
  DownloadFileRequestSchema,
} from '@yhonda-ohishi-pub-dev/logi-proto';
import { getFilesClient } from '~/server/utils/grpc-client';

type GrpcMethod =
  | 'list'
  | 'get'
  | 'download'
  | 'delete'
  | 'listNotAttached'
  | 'listRecentUploaded'
  | 'restore';

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
    const client = await getFilesClient();
    const params = body.params || {};

    switch (body.method) {
      case 'list': {
        const request = create(ListFilesRequestSchema, {
          typeFilter: params.typeFilter as string | undefined,
        });
        const response = await client.listFiles(request);
        return {
          files: response.files,
        };
      }

      case 'get': {
        const request = create(GetFileRequestSchema, {
          uuid: params.uuid as string,
          includeBlob: params.includeBlob as boolean ?? true,
        });
        const response = await client.getFile(request);
        return {
          file: response.file,
        };
      }

      case 'download': {
        // サーバーストリーミングRPCでファイルをダウンロード
        const request = create(DownloadFileRequestSchema, {
          uuid: params.uuid as string,
        });

        // チャンクを収集してBase64に変換
        const chunks: Uint8Array[] = [];
        for await (const chunk of client.downloadFile(request)) {
          chunks.push(chunk.data);
        }

        // 全チャンクを結合
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        // Base64エンコード
        const base64 = Buffer.from(combined).toString('base64');

        return {
          blob: base64,
        };
      }

      case 'delete': {
        const request = create(DeleteFileRequestSchema, {
          uuid: params.uuid as string,
        });
        await client.deleteFile(request);
        return { success: true };
      }

      case 'listNotAttached': {
        const response = await client.listNotAttachedFiles(create(ListFilesRequestSchema, {}));
        return {
          files: response.files,
        };
      }

      case 'listRecentUploaded': {
        const response = await client.listRecentUploadedFiles(create(ListFilesRequestSchema, {}));
        return {
          files: response.files,
        };
      }

      case 'restore': {
        const request = create(RestoreFileRequestSchema, {
          uuid: params.uuid as string,
        });
        const response = await client.restoreFile(request);
        return {
          uuid: response.uuid,
          restoreStatus: response.restoreStatus,
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
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
