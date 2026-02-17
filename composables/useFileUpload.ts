/**
 * ファイルアップロードComposable
 * Cloudflare (REST) と rust-logi (gRPC) に対応
 */

export const useFileUpload = () => {
  const backend = useApiBackend();

  /**
   * ファイルをアップロード
   * @returns { uuid, message } のレスポンス
   */
  const upload = async (file: File, from?: string): Promise<{ uuid: string; message: string }> => {
    if (backend === 'rust-logi') {
      // rust-logi: ブラウザ側Connect RPC経由（cf-grpc-proxy → CloudRun）
      const { $grpc } = useNuxtApp();
      const content = new Uint8Array(await file.arrayBuffer());
      const response = await $grpc.files.createFile({
        filename: file.name || 'unnamed',
        type: file.type || 'application/octet-stream',
        content,
      });
      const uuid = (response?.file as Record<string, unknown>)?.uuid as string || '';
      return { uuid, message: '送信完了しました' };
    } else {
      // cloudflare / cloudrun: 既存のサーバーサイドアップロード
      const form = new FormData();
      form.append('data', file);
      if (from) {
        form.append('from', from);
      }
      const res = await $fetch<{ uuid: string; message: string }>('/api/recieve', {
        method: 'post',
        body: form,
      });
      return res || { uuid: '', message: '' };
    }
  };

  return { upload };
};
