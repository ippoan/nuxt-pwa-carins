/**
 * ファイルダウンロードComposable
 * Cloudflare (REST) と Cloud Run (gRPC) の両方に対応
 */

interface FileResponse {
  blob: string | null;
  type: string;
  filename: string;
}

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
    } else {
      // Cloud Run gRPC プロキシ使用
      const response = await $fetch<{ file: FileResponse }>('/api/grpc/files', {
        method: 'POST',
        body: {
          method: 'get',
          params: { uuid, includeBlob: true }
        },
      });
      if (response?.file) {
        blob = B64toBlob(response.file.blob, response.file.type);
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
    } else {
      // Cloud Run gRPC プロキシ使用
      const response = await $fetch<{ file: FileResponse }>('/api/grpc/files', {
        method: 'POST',
        body: {
          method: 'get',
          params: { uuid, includeBlob: true }
        },
      });
      if (response?.file) {
        blob = B64toBlob(response.file.blob, response.file.type);
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
