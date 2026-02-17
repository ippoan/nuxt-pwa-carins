/**
 * APIバックエンドの種類を判定するComposable
 */

export type ApiBackend = 'cloudflare' | 'cloudrun' | 'rust-logi';

export const useApiBackend = (): ApiBackend => {
  const config = useRuntimeConfig();
  return (config.public.apiBackend as ApiBackend) || 'cloudflare';
};
