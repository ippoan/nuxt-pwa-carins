<template>
    <div class="p-3 bg-gray-50 dark:bg-gray-900 border-l-4 border-sky-500">
        <div class="text-xs font-semibold mb-2">
            車両履歴 (CarId: {{ props.carId }})
            <span v-if="history" class="font-normal text-gray-500">— {{ history.length }} 件</span>
        </div>

        <div v-if="status === 'pending'" class="text-sm text-gray-500">読み込み中…</div>

        <div v-else-if="!history || history.length === 0" class="text-sm text-gray-500">
            この車両の過去の車検証はありません
        </div>

        <table v-else class="w-full text-xs border-collapse">
            <thead>
                <tr class="bg-gray-200 dark:bg-gray-800">
                    <th class="border px-2 py-1 text-left">交付日</th>
                    <th class="border px-2 py-1 text-left">有効期限</th>
                    <th class="border px-2 py-1 text-left">所有者</th>
                    <th class="border px-2 py-1 text-left">使用者</th>
                    <th class="border px-2 py-1 text-left">車番</th>
                    <th class="border px-2 py-1 text-center">PDF</th>
                    <th class="border px-2 py-1 text-center">JSON</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in history" :key="row.id" class="hover:bg-white dark:hover:bg-gray-950">
                    <td class="border px-2 py-1">{{ formatGrantdate(row) }}</td>
                    <td class="border px-2 py-1">{{ formatExpirdate(row.TwodimensionCodeInfoValidPeriodExpirdate) }}</td>
                    <td class="border px-2 py-1">{{ row.OwnernameLowLevelChar }}</td>
                    <td class="border px-2 py-1">{{ row.UsernameLowLevelChar }}</td>
                    <td class="border px-2 py-1">{{ row.EntryNoCarNo }}</td>
                    <td class="border px-2 py-1 text-center">
                        <ButtonDownload
                            v-if="row.pdfUuid"
                            :uuid="row.pdfUuid"
                            :filename="makeFilename(row) + '.pdf'"
                            :storage-verified="true"
                        />
                        <span v-else class="text-gray-400">—</span>
                    </td>
                    <td class="border px-2 py-1 text-center">
                        <ButtonDownload
                            v-if="row.jsonUuid"
                            :uuid="row.jsonUuid"
                            :filename="makeFilename(row) + '.json'"
                            :storage-verified="true"
                        />
                        <span v-else class="text-gray-400">—</span>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    carId: string
}>()

const carIdRef = computed(() => props.carId)
const { data: history, status, execute } = useCarInspectionHistory(carIdRef)

onMounted(() => {
    execute()
})

function formatExpirdate(s: string | undefined | null): string {
    if (!s || s.length < 6) return ''
    return `${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`
}

function formatGrantdate(row: Record<string, unknown>): string {
    const e = row.GrantdateE ?? ''
    const y = row.GrantdateY ?? ''
    const m = row.GrantdateM ?? ''
    const d = row.GrantdateD ?? ''
    if (!y && !m && !d) return ''
    return `${e}${y}年${String(m).padStart(2, '0')}月${String(d).padStart(2, '0')}日`
}

function makeFilename(row: Record<string, unknown>): string {
    const expiry = String(row.TwodimensionCodeInfoValidPeriodExpirdate ?? '')
    const carNo = String(row.EntryNoCarNo ?? '')
    return `${expiry}_${carNo}`
}
</script>
