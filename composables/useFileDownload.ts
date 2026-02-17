/**
 * ファイルダウンロードComposable
 * Cloudflare (REST), Cloud Run (gRPC直接), rust-logi (cf-grpc-proxy経由) に対応
 */

/**
 * Base64をBlobに変換
 */
function B64toBlob(base64: string | null | undefined, type: string): Blob | null {
  if (base64 == null) {
    return null;
  }
  const bin = atob(base64.replace(/^.*,/, ''));
  const buffer = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    buffer[i] = bin.charCodeAt(i);
  }
  try {
    return new Blob([buffer.buffer], { type });
  } catch (e) {
    return new Blob();
  }
}

/**
 * rust-logi経由でファイルのBlobを取得（ストリーミングダウンロード）
 * Base64を経由せず、バイナリチャンクを直接Blobに変換
 */
async function fetchBlobViaRustLogi(
  $grpc: ReturnType<typeof useNuxtApp>['$grpc'],
  uuid: string,
): Promise<Blob | null> {
  // ファイル情報を取得してMIMEタイプを取得
  const fileInfo = await $grpc.files.getFile({ uuid, includeBlob: false });
  const mimeType = (fileInfo?.file as Record<string, unknown>)?.type as string || 'application/octet-stream';

  // ストリーミングダウンロード
  const chunks: Uint8Array[] = [];
  for await (const chunk of $grpc.files.downloadFile({ uuid })) {
    chunks.push(chunk.data);
  }

  if (chunks.length === 0) return null;
  return new Blob(chunks, { type: mimeType });
}

/**
 * ファイルダウンロード機能を提供
 */
export const useFileDownload = () => {
  const backend = useApiBackend();

  const download = async (uuid: string, filename: string) => {
    let blob: Blob | null = null;

    if (backend === 'cloudflare') {
      // 既存のnuxt-api-party使用
      const data = await $jsonPlaceholder("/api/files/viewJson/{uuid}", {
        path: { uuid },
      });
      blob = B64toBlob(data.blob, data.type);
    } else if (backend === 'rust-logi') {
      // rust-logi: ブラウザ側Connect RPC経由（ストリーミングダウンロード）
      try {
        const { $grpc } = useNuxtApp();
        blob = await fetchBlobViaRustLogi($grpc, uuid);
      } catch (error) {
        console.error('rust-logi download error:', error);
        return false;
      }
    } else {
      // Cloud Run gRPC プロキシ使用（直接接続）
      try {
        const fileInfo = await $fetch<{ file: { type: string } }>('/api/grpc/files', {
          method: 'POST',
          body: {
            method: 'get',
            params: { uuid, includeBlob: false }
          },
        });
        const mimeType = fileInfo?.file?.type || 'application/octet-stream';

        const response = await $fetch<{ blob: string }>('/api/grpc/files', {
          method: 'POST',
          body: {
            method: 'download',
            params: { uuid }
          },
        });
        if (response?.blob) {
          blob = B64toBlob(response.blob, mimeType);
        }
      } catch (error) {
        console.error('gRPC fetch error:', error);
        return false;
      }
    }

    if (blob == null) {
      console.error('Failed to download file: blob is null');
      return false;
    }

    // ダウンロード処理
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.target = '_blank';
    a.download = filename || 'noname';
    a.click();

    // メモリリーク防止
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);

    return true;
  };

  /**
   * PDFをプレビュー表示（新しいタブで開く）
   */
  const preview = async (uuid: string): Promise<boolean> => {
    let blob: Blob | null = null;

    if (backend === 'cloudflare') {
      // 既存のnuxt-api-party使用
      const data = await $jsonPlaceholder("/api/files/viewJson/{uuid}", {
        path: { uuid },
      });
      blob = B64toBlob(data.blob, data.type);
    } else if (backend === 'rust-logi') {
      // rust-logi: ブラウザ側Connect RPC経由（ストリーミングダウンロード）
      try {
        const { $grpc } = useNuxtApp();
        blob = await fetchBlobViaRustLogi($grpc, uuid);
      } catch (error) {
        console.error('rust-logi preview error:', error);
        return false;
      }
    } else {
      // Cloud Run gRPC プロキシ使用（直接接続）
      try {
        const fileInfo = await $fetch<{ file: { type: string } }>('/api/grpc/files', {
          method: 'POST',
          body: {
            method: 'get',
            params: { uuid, includeBlob: false }
          },
        });
        const mimeType = fileInfo?.file?.type || 'application/octet-stream';

        const response = await $fetch<{ blob: string }>('/api/grpc/files', {
          method: 'POST',
          body: {
            method: 'download',
            params: { uuid }
          },
        });
        if (response?.blob) {
          blob = B64toBlob(response.blob, mimeType);
        }
      } catch (error) {
        console.error('gRPC fetch error:', error);
        return false;
      }
    }

    if (blob == null) {
      console.error('Failed to preview file: blob is null');
      return false;
    }

    // 新しいタブでPDFを表示
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // メモリリーク防止
    setTimeout(() => URL.revokeObjectURL(url), 60000);

    return true;
  };

  return { download, preview };
};
