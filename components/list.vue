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
            <Scan BtnName="Scan" v-model:serial="serial" v-model:type="type" v-model:timestamp="timestamp" />
            <div>
                serial:{{ serial }}

            </div>



            <div v-if="RecentData">
                {{ RecentStatus }}
                <UTable :rows="RecentData" :key="RecentStatus" :loading="RecentStatus === 'pending'">
                    <template #uuid-data="{ row }">
                        <ButtonDownload :uuid="row.uuid" :filename="row.filename" />
                    </template>
                </UTable>
            </div>

            <div v-if="data !== null" class="grid-row-3 mx-auto">

                <UButton to="https://www.e-shaken.mlit.go.jp/etsuran01">車検証アプリを開く</UButton>
                <UInput placeholder="Search..." v-model="q"></UInput>

                <UButton @click="refreshData"> 更新</UButton> {{ status }} {{ refCount }}
                <!-- <UTable :rows="filteredRows" :sort="{column:'EntryNoCarNo',direction:'asc'}" :columns="Columns" @select="select" :ui="{ -->
                <UTable :rows="filteredRows" :sort="sort" :columns="Columns" @select="select" :key="status"
                    :loading="status === 'pending'" :ui="{

                        base: ' border-separate border-spacing-0 min-w-fit mx-auto',
                        // wrapper: 'h-[50vh] border border-white',
                        wrapper: 'border border-white',
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
                        <CarInsCarName :EntryNoCarNo="row.EntryNoCarNo" />
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

                            <ButtonDownload :uuid="row.pdfUuid" :filename="makeSt(row)" />
                            <!-- {{ row.pdfUuid }} -->
                        </div>
                    </template>

                    <template #jsonUuid-data="{ row }">
                        <div v-if="row.pdfUuid != null && row.pdfUuid == row.jsonUuid" class="bg-red-500">
                            {{ row.EntryNoCarNo }}
                        </div>
                        <div v-else>

                            <ButtonDownload :uuid="row.jsonUuid" :filename="makeSt(row)" />
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
const Columns = [
    // { label: "車検証番号", key: "ElectCertMgNo" },
    // { label: "車両ID", key: "CarId" },
    // { label: "発行日", key: "Publishdate" },
    // { label: "支局", key: "TranspotationBureauchiefName" },
    // { label: "車両番号", key: "TwodimensionCodeInfoEntryNoCarNo", sortable: true },
    // { label: "車両番号", key: "TwodimensionCodeInfoCarNo", sortable: true },
    // { label: "車両番号", key: "TwodimensionCodeInfoModelSpecifyNoClassifyAroundNo", sortable: true },
    // { label: "車両番号", key: "TwodimensionCodeInfoCarNoStampPlace", sortable: true },
    { label: "車両番号", key: "EntryNoCarNo", sortable: true },
    { label: "有効期限", key: "TwodimensionCodeInfoValidPeriodExpirdate", sortable: true },
    { label: "所有者", key: "OwnernameLowLevelChar" },
    { label: "使用者", key: "UsernameLowLevelChar" },
    { label: "最大積載量", key: "Maxloadage" },
    { label: "長さ", key: "Length" },
    { label: "幅", key: "Width" },
    { label: "高さ", key: "Height" },
    { label: "車台番号", key: "CarNo" },
    { label: "型式", key: "Model" },
    { label: "原動機型式", key: "EngineModel" },
    { label: "車体形状", key: "CarShape" },
    { label: "所度登録", key: "Firstregistdate" },
    { label: "備考", key: "NoteInfo" },
    { label: "pdf", key: "actions" },
    { label: "pdf", key: "pdfUuid" },
    { label: "json", key: "jsonUuid" },
]


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