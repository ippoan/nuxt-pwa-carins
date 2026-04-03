/**
 * NFC タグ管理 Composable
 * rust-alc-api REST API 経由
 */
import type { NfcTag, NfcTagSearchResponse } from '~/types/alc-api'

export const useNfcTag = () => {
  const { token } = useAuth()

  const headers = (): Record<string, string> => token.value ? { Authorization: `Bearer ${token.value}` } : {}

  const searchByNfcUuid = async (nfcUuid: string) => {
    return await $fetch<NfcTagSearchResponse>('/api/proxy/nfc-tags/search', {
      params: { uuid: nfcUuid },
      headers: headers(),
    })
  }

  const registerNfcTag = async (nfcUuid: string, carInspectionId: number) => {
    return await $fetch<NfcTag>('/api/proxy/nfc-tags', {
      method: 'POST',
      headers: headers(),
      body: { nfc_uuid: nfcUuid, car_inspection_id: carInspectionId },
    })
  }

  const listNfcTags = async (carInspectionId?: number) => {
    return await $fetch<NfcTag[]>('/api/proxy/nfc-tags', {
      params: carInspectionId ? { car_inspection_id: carInspectionId } : {},
      headers: headers(),
    })
  }

  const deleteNfcTag = async (nfcUuid: string) => {
    return await $fetch(`/api/proxy/nfc-tags/${nfcUuid}`, {
      method: 'DELETE',
      headers: headers(),
    })
  }

  return { searchByNfcUuid, registerNfcTag, listNfcTags, deleteNfcTag }
}
