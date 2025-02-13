
<template>
    <div>
        {{ (prop.EntryNoCarNo.replaceAll(" ","").replaceAll("　","")+"　　　　　").slice(0,11) }}　{{ prop.EntryNoCarNo.replaceAll(" ","").replaceAll("　","").replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  }) }}
    </div>
</template>
<script setup lang="ts">
import type { components } from '#nuxt-api-party/jsonPlaceholder';
// type Row = components["schemas"]["carInspectionSchema"]
const prop = defineProps<{
    EntryNoCarNo: string
}>()
</script>