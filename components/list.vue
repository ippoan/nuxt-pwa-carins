<template>
    <div v-if="data !== null" class="grid-row-3 mx-auto">

        <UInput placeholder="Search..." v-model="q"></UInput>

        <UTable :rows="filteredRows" :columns="Columns" @select="select" :ui="{

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

</template>
<script setup lang="ts">
import type { components } from '#nuxt-api-party/jsonPlaceholder';



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

const q = ref("");


const Columns = [
    // { label: "車検証番号", key: "ElectCertMgNo" },
    // { label: "車両ID", key: "CarId" },
    // { label: "発行日", key: "Publishdate" },
    // { label: "支局", key: "TranspotationBureauchiefName" },
    { label: "車両番号", key: "EntryNoCarNo" },
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


const { data, execute, refresh } = useJsonPlaceholderData("/api/carInspect", {
    method: "GET",
    transform: (v) => {
        if (v == null) return undefined
        return v
    }
})


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