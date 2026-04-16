<template>

    <div ref="dropZoneRef" class="h-[80svh] relative">

        <div v-show="showDropZone"
            class="absolute inset-0 flex flex-col w-full h-full bg-gray-400/50 justify-center items-center rounded z-50">
            <div class="text-2xl">Drop here</div>
            <div
                class="absolute top-2 left-2 px-4 py-2 bg-gray-500 text-white rounded"
                @mouseenter="cancelDrop"
            >
                ここにマウスでキャンセル
            </div>
        </div>
        <div>

            <details v-if="RecentData" class="mb-2">
                <summary class="cursor-pointer text-sm">最近のファイル ({{ Math.min(RecentData.length, 20) }})</summary>
                <UTable :rows="RecentData.slice(0, 20)" :key="RecentStatus" :loading="RecentStatus === 'pending'">
                    <template #uuid-data="{ row }">
                        <ButtonDownload :uuid="row.uuid" :filename="row.filename" :storage-verified="row.storageVerified" />
                    </template>
                </UTable>
            </details>

            <div v-if="data !== null" class="grid-row-3 mx-auto">

                <UInput placeholder="Search..." v-model="q" />
                <div class="flex flex-wrap gap-x-3 gap-y-1 my-1">
                    <label v-for="col in AllColumns.filter(c => c.key !== 'actions')" :key="col.key"
                        class="flex items-center gap-1 text-xs cursor-pointer select-none">
                        <input type="checkbox" :checked="!hiddenKeys.has(col.key)" @change="toggleColumn(col.key)" />
                        {{ col.label || col.key }}
                    </label>
                </div>

                <!-- <UTable :rows="filteredRows" :sort="{column:'EntryNoCarNo',direction:'asc'}" :columns="Columns" @select="select" :ui="{ -->
                <UTable :rows="filteredRows" :sort="sort" :columns="Columns" @select="select" :key="status"
                    :loading="status === 'pending'" class="sticky-cols" :ui="{

                        base: ' border-separate border-spacing-0 min-w-fit mx-auto',
                        // wrapper: 'h-[50vh] border border-white',
                        wrapper: 'border border-white overflow-x-auto',
                        tr: {
                            active: 'hover:bg-gray-200 dark:hover:bg-gray-100/50 cursor-pointer'
                        },
                        th: {
                            base:
                                'text-center rtl:text-right border-black bg-white border-l border-l-black last:border-r last:border-r-black border-y border-separate sticky top-0 dark:bg-black z-30',
                            padding: 'px-1'
                        },
                        td: {

                            base: 'border-l border-l-black last:border-r last:border-r-black ',
                            padding: 'px-1 pb-0 pt-1'
                        }
                    }">
                    <template #TwodimensionCodeInfoValidPeriodExpirdate-data="{ row }">
                        <CarInsTwodimensionCodeInfoValidPeriodExpirdate
                            :TwodimensionCodeInfoValidPeriodExpirdate="row.TwodimensionCodeInfoValidPeriodExpirdate" />
                    </template>
                    <template #Publishdate-data="{ row }">
                        <CarInsPublishdate :row="row" />
                    </template>

                    <template #EntryNoCarNo-data="{ row }">
                        {{ toHalfWidth(row.EntryNoCarNo) }}
                    </template>
                    <template #Firstregistdate-data="{ row }">
                        <CarInsFirstregistdate :row="row" />
                    </template>
                    <template #NoteInfo-data="{ row }">
                        <CarInsNoteInfo :NoteInfo="row.NoteInfo" />
                    </template>
                    <template #pdfUuid-data="{ row }">
                        <div v-if="row.pdfUuid != null && row.pdfUuid == row.jsonUuid" class="bg-red-500">
                            {{ row.EntryNoCarNo }}
                        </div>
                        <div v-else>

                            <ButtonDownload :uuid="row.pdfUuid" :filename="makeSt(row) + '.pdf'" />
                            <!-- {{ row.pdfUuid }} -->
                        </div>
                    </template>

                    <template #jsonUuid-data="{ row }">
                        <div v-if="row.pdfUuid != null && row.pdfUuid == row.jsonUuid" class="bg-red-500">
                            {{ row.EntryNoCarNo }}
                        </div>
                        <div v-else>

                            <ButtonDownload :uuid="row.jsonUuid" :filename="makeSt(row) + '.json'" />
                            <!-- {{ row.pdfUuid }} -->
                        </div>
                    </template>
                    <template #actions-data="{ row }">
                        <UButton
                            color="sky"
                            icon="i-ic:baseline-content-paste-search"
                            :ui="{ rounded: 'rounded-none' }"
                            @click.stop="previewPdf(row)"
                        />
                    </template>
                </UTable>
            </div>
            <!-- <div>

            <UTable :rows="data" :ui="{

                base: ' border-separate border-spacing-0',
                wrapper: ' h-[50vh] border border-white',
                td: { padding: 'py-0' }
            }"></UTable>
        </div> -->
        </div>

    </div>

</template>
<script setup lang="ts">

/** 全角英数→半角、全角スペース→半角スペース */
function toHalfWidth(s: string): string {
    return s.replace(/[\uff01-\uff5e]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
            .replace(/\u3000/g, ' ')
}

function makeSt(row: components["schemas"]["carInspectionSchema"]) {
    return row.TwodimensionCodeInfoValidPeriodExpirdate + "_" + row.TwodimensionCodeInfoEntryNoCarNo + "_" + row.ElectCertPublishdateE + row.ElectCertPublishdateY + "年" + ("00" + row.ElectCertPublishdateM).slice(-2) + "月" + ("00" + row.ElectCertPublishdateD).slice(-2) + "日発行"
}

const serial = ref();
const type = ref();

const timestamp = ref();
import type { components } from '#nuxt-api-party/jsonPlaceholder';
import Scan from './scan.vue';


import { useDropZone } from '@vueuse/core'

const filesData = shallowRef<{ name: string, size: number, type: string, lastModified: number }[]>([])
const { upload } = useFileUpload();

async function onDrop(files: File[] | null) {
    filesData.value = []
    showDropZone.value = false
    if (files) {
        files.sort((a, b) =>
            a.lastModified > b.lastModified ? 1 : -1
        );

        console.log("file:", files)
        await Promise.all(files.map(async ff => {
            const res = await upload(ff)
            console.log("res:", res)
            console.log("onDropPost")
        }))
        await refreshData()
        console.log("Refreshed")
    }

}

const dropZoneRef = useTemplateRef<HTMLElement>('dropZoneRef')
const showDropZone = ref(false)
const cancelled = ref(false)

const { isOverDropZone } = useDropZone(dropZoneRef, onDrop)

// ドラッグ開始時にドロップゾーンを表示
watch(isOverDropZone, (newVal) => {
    console.log('isOverDropZone changed:', newVal, 'cancelled:', cancelled.value, 'showDropZone:', showDropZone.value)
    if (newVal && !cancelled.value) {
        showDropZone.value = true
        console.log('showDropZone set to true')
    }
    // showDropZoneがfalseの時だけcancelledをリセット
    if (!newVal && !showDropZone.value) {
        cancelled.value = false
        console.log('cancelled reset to false')
    }
})

function cancelDrop() {
    console.log('cancelDrop called, before:', { showDropZone: showDropZone.value, cancelled: cancelled.value })
    showDropZone.value = false
    cancelled.value = true
    console.log('cancelDrop done, after:', { showDropZone: showDropZone.value, cancelled: cancelled.value })
}

function select(row: components["schemas"]["carInspectionSchema"]) {
    if (filteredRows.value) {

        const index = filteredRows.value.findIndex(item => item.ElectCertMgNo === row.ElectCertMgNo)
        if (index === -1) {
            // selected.value.push(row)
        } else {
            console.log(row)
            // selected.value.splice(index, 1)
        }
    }
}

const { preview: previewFile } = useFileDownload();

async function previewPdf(row: components["schemas"]["carInspectionSchema"]) {
    if (row.pdfUuid) {
        await previewFile(row.pdfUuid)
    }
}

const refCount = ref(0)
const q = ref("");

const sort = ref({
    column: 'EntryNoCarNo',
    direction: 'asc' as const

})
const STORAGE_KEY = 'carins-hidden-columns'

const AllColumns = [
    { label: "", key: "actions" },
    { label: "車番", key: "EntryNoCarNo", sortable: true },
    { label: "有効期限", key: "TwodimensionCodeInfoValidPeriodExpirdate", sortable: true },
    { label: "所有者", key: "OwnernameLowLevelChar" },
    { label: "使用者", key: "UsernameLowLevelChar" },
    { label: "最大積載量", key: "Maxloadage" },
    { label: "車両重量", key: "CarWgt" },
    { label: "車両総重量", key: "CarTotalWgt" },
    { label: "長さ", key: "Length" },
    { label: "幅", key: "Width" },
    { label: "高さ", key: "Height" },
    { label: "車台番号", key: "CarNo" },
    { label: "型式", key: "Model" },
    { label: "原動機型式", key: "EngineModel" },
    { label: "車体形状", key: "CarShape" },
    { label: "所度登録", key: "Firstregistdate" },
    { label: "備考", key: "NoteInfo" },
    { label: "pdf", key: "pdfUuid" },
    { label: "json", key: "jsonUuid" },
]

const hiddenKeys = ref(new Set<string>())
onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
        try {
            const arr = JSON.parse(saved) as string[]
            hiddenKeys.value = new Set(arr)
        } catch {}
    }
})

function toggleColumn(key: string) {
    const next = new Set(hiddenKeys.value)
    if (next.has(key)) {
        next.delete(key)
    } else {
        next.add(key)
    }
    hiddenKeys.value = next
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
}

const Columns = computed(() =>
    AllColumns.filter(c => !hiddenKeys.value.has(c.key))
)


// バックエンド切り替え対応のComposablesを使用
const { data: RecentData, refresh: RecentRefresh, status: RecentStatus, clear: RecentClear } = useRecentFilesData({
    lazy: true,
    cache: false,
})

const { data, execute, refresh, status, clear } = useCarInspectionData({
    cache: false,
})

async function refreshData() {
    clear()
    RecentClear()
    console.log("RecentData.value?.length:", RecentData.value?.length)
    refCount.value++
    status.value = "pending"
    RecentStatus.value = "pending"
    await RecentRefresh()
    await refresh()
    console.log("RecentData.value?.length:", RecentData.value?.length)
    refCount.value++
    status.value = "success"

    RecentStatus.value = "success"

}


const filteredRows = computed(() => {
    if (!q.value) {
        // console.log("dd");
        return data.value != null ? data.value : undefined;
    }
    //   console.log("else");
    if (data.value) {

        const filter = data.value.filter((dd) => {
            return Object.values(dd).some((value) => {
                // console.log(value)
                // console.log("q", q.value);
                const st = q.value.replace("\n", "").replace("\r\n", "");
                return String(value).includes(st);
            });
        });
        return filter != null ? filter : undefined
    } else {
        return undefined
        data.value
    }
});

</script>

<style scoped>
/* 1列目(表示ボタン) を sticky left 固定 */
.sticky-cols :deep(td:nth-child(1)),
.sticky-cols :deep(th:nth-child(1)) {
    position: sticky;
    left: 0;
    z-index: 20;
}
/* 2列目(車両番号) を sticky left 固定（1列目の幅分オフセット） */
.sticky-cols :deep(td:nth-child(2)),
.sticky-cols :deep(th:nth-child(2)) {
    position: sticky;
    left: 36px;
    z-index: 20;
}
/* 背景色を明示（透過防止） */
.sticky-cols :deep(td:nth-child(1)),
.sticky-cols :deep(td:nth-child(2)) {
    background: #111 !important;
}
:root.light .sticky-cols :deep(td:nth-child(1)),
:root.light .sticky-cols :deep(td:nth-child(2)),
@media (prefers-color-scheme: light) {
    .sticky-cols :deep(td:nth-child(1)),
    .sticky-cols :deep(td:nth-child(2)) {
        background: #fff !important;
    }
}
/* sticky top+left の角セル（ヘッダー） */
.sticky-cols :deep(th:nth-child(1)),
.sticky-cols :deep(th:nth-child(2)) {
    z-index: 40;
}
</style>