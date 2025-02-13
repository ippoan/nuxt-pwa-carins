<template>
    <div>
        {{ row.FirstregistdateE+("00"+row.FirstregistdateY).slice(-2)+"年"+("00"+row.FirstregistdateM).slice(-2)+"月"}}
    </div>
</template>
<script setup lang="ts">
import type { components } from '#nuxt-api-party/jsonPlaceholder';
type Row = components["schemas"]["carInspectionSchema"]
const prop = defineProps<{
    row: Row
}>()
</script>