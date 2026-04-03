/**
 * 車検証データ取得 Composable
 * rust-alc-api REST API 経由
 */
import type { CarInspectionListResponse } from '~/types/alc-api'

interface UseCarInspectionDataOptions {
  lazy?: boolean
}

/**
 * 現在有効な車検証一覧を取得
 */
export const useCarInspectionData = (options?: UseCarInspectionDataOptions) => {
  const { token } = useAuth()

  return useAsyncData('carInspections', async () => {
    const res = await $fetch<CarInspectionListResponse>('/api/proxy/car-inspections/current', {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    })
    return res?.carInspections
  }, {
    lazy: options?.lazy ?? false,
    server: false,
  })
}

/**
 * 期限切れ・期限間近の車検証一覧を取得
 */
export const useExpiredCarInspectionData = (options?: UseCarInspectionDataOptions) => {
  const { token } = useAuth()

  return useAsyncData('expiredCarInspections', async () => {
    const res = await $fetch<CarInspectionListResponse>('/api/proxy/car-inspections/expired', {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    })
    return res?.carInspections
  }, {
    lazy: options?.lazy ?? true,
    server: false,
  })
}
