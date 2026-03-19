/**
 * NFC タグ管理 Composable
 * NFC UUID と車検証の紐づけ操作
 */
export const useNfcTag = () => {
  const { $grpc } = useNuxtApp()

  const searchByNfcUuid = async (nfcUuid: string) => {
    return await $grpc.nfcTags.searchByNfcUuid({ nfcUuid })
  }

  const registerNfcTag = async (nfcUuid: string, carInspectionId: number) => {
    return await $grpc.nfcTags.registerNfcTag({ nfcUuid, carInspectionId })
  }

  const listNfcTags = async (carInspectionId?: number) => {
    return await $grpc.nfcTags.listNfcTags({ carInspectionId })
  }

  const deleteNfcTag = async (nfcUuid: string) => {
    return await $grpc.nfcTags.deleteNfcTag({ nfcUuid })
  }

  return { searchByNfcUuid, registerNfcTag, listNfcTags, deleteNfcTag }
}
