
<template>
    <div>
        {{ prop.EntryNoCarNo.replaceAll(" ","").replaceAll("　","") }}
    </div>
</template>
<script setup lang="ts">
import type { components } from '#nuxt-api-party/jsonPlaceholder';
// type Row = components["schemas"]["carInspectionSchema"]
const prop = defineProps<{
    EntryNoCarNo: string
}>()
</script>