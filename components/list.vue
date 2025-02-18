<template>

    <div ref="dropZoneRef" class="h-[80svh]">

        <div v-if="isOverDropZone"
            class="flex flex-col  w-full min-h-200px h-[80svh] bg-gray-400/10 justify-center items-center mt-6 rounded">
            Drop here
        </div>
        <div v-else>
            <Scan BtnName="Scan" v-model:serial="serial" v-model:type="type" v-model:timestamp="timestamp" />
            <div>
                serial:{{ serial }}

            </div>



            <div v-if="RecentData">
                {{ RecentStatus }}
                <UTable :rows="RecentData" :key="RecentStatus" :loading="RecentStatus === 'pending'" />
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

                            base: 'border-l border-l-black last:border-r last:border-r-black',
                            padding: 'px-1 py-0'
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

const serial = ref();
const type = ref();

const timestamp = ref();
import type { components } from '#nuxt-api-party/jsonPlaceholder';
import Scan from './scan.vue';


import { useDropZone } from '@vueuse/core'

const filesData = shallowRef<{ name: string, size: number, type: string, lastModified: number }[]>([])

async function onDrop(files: File[] | null) {
    filesData.value = []
    if (files) {
        // filesData.value = files.map(file => ({
        //   name: file.name,
        //   size: file.size,
        //   type: file.type,
        //   lastModified: file.lastModified,
        // }))

        files.sort((a, b) =>
            a.lastModified > b.lastModified ? 1 : -1
        );

        console.log("file:",files)
        await Promise.all(files.map(async ff => {

            const form = new FormData()
            form.append("data", ff)
            form.append("noredirect", "")
            var res = await $fetch("/api/recieve", { method: "post", body: form })
            console.log("res:", res)
            console.log("onDropPost")
        }))
        await refreshData()
        console.log("Refreshed")
    }

}

const dropZoneRef = useTemplateRef<HTMLElement>('dropZoneRef')

const { isOverDropZone } = useDropZone(dropZoneRef, onDrop)

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
    { label: "車両番号", key: "EntryNoCarNo", sortable: true },
    { label: "有効期限", key: "TwodimensionCodeInfoValidPeriodExpirdate" },
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
]


const { data: RecentData, refresh: RecentRefresh, status: RecentStatus, clear: RecentClear } = useJsonPlaceholderData("/api/files/RecentUploaded", {
    method: "GET",
    lazy: true,
    cache: false,
    transform: (v) => {
        if (v == null) return undefined
        return v
    }
})



const { data, execute, refresh, status, clear } = useJsonPlaceholderData("/api/carInspect/current", {
    method: "GET",
    cache: false,
    transform: (v) => {
        if (v == null) return undefined
        return v
    }
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