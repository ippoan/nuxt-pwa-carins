<template>
    <div>
        {{ row.ElectCertPublishdateE+row.ElectCertPublishdateY+"年"+("00"+row.ElectCertPublishdateM).slice(-2)+"月"+("00"+row.ElectCertPublishdateD).slice(-2)+"日" }}
    </div>
</template>
<script setup lang="ts">
import type { components } from '#nuxt-api-party/jsonPlaceholder';
type Row = components["schemas"]["carInspectionSchema"]
const prop = defineProps<{
    row: Row
}>()
</script>