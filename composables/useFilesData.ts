/**
 * ファイルデータ取得Composable
 * Cloudflare (REST) と Cloud Run (gRPC) の両方に対応
 */

interface FileData {
  uuid: string;
  filename: string;
  type: string;
  created: string;
  deleted?: string;
  blob?: string;
  s3Key?: string;
  storageClass?: string;
  lastAccessedAt?: string;
}

interface UseFilesDataOptions {
  lazy?: boolean;
  cache?: boolean;
}

/**
 * gRPCレスポンスからREST API互換形式に変換
 */
function mapGrpcFileToSchema(grpc: Record<string, unknown>): FileData {
  return {
    uuid: grpc.uuid as string,
    filename: grpc.filename as string,
    type: grpc.type as string,
    created: grpc.created as string,
    deleted: grpc.deleted as string | undefined,
    blob: grpc.blob as string | undefined,
    s3Key: grpc.s3Key as string | undefined,
    storageClass: grpc.storageClass as string | undefined,
    lastAccessedAt: grpc.lastAccessedAt as string | undefined,
  };
}

/**
 * 最近アップロードされたファイル一覧を取得
 */
export const useRecentFilesData = (options?: UseFilesDataOptions) => {
  const backend = useApiBackend();

  if (backend === 'cloudflare') {
    return useJsonPlaceholderData("/api/files/RecentUploaded", {
      method: "GET",
      lazy: options?.lazy ?? true,
      cache: options?.cache ?? false,
      transform: (v) => v ?? undefined,
    });
  } else {
    return useFetch<FileData[]>('/api/grpc/files', {
      method: 'POST',
      body: { method: 'listRecentUploaded', params: {} },
      lazy: options?.lazy ?? true,
      transform: (response: { files?: Record<string, unknown>[] }) => {
        if (!response?.files) return undefined;
        return response.files.map(mapGrpcFileToSchema);
      },
    });
  }
};

/**
 * ファイル一覧を取得
 */
export const useFilesData = (options?: UseFilesDataOptions) => {
  const backend = useApiBackend();

  if (backend === 'cloudflare') {
    return useJsonPlaceholderData("/api/files/list", {
      method: "GET",
      lazy: options?.lazy ?? true,
      cache: options?.cache ?? false,
      transform: (v) => v ?? undefined,
    });
  } else {
    return useFetch<FileData[]>('/api/grpc/files', {
      method: 'POST',
      body: { method: 'list', params: {} },
      lazy: options?.lazy ?? true,
      transform: (response: { files?: Record<string, unknown>[] }) => {
        if (!response?.files) return undefined;
        return response.files.map(mapGrpcFileToSchema);
      },
    });
  }
};
