<template>
    <details>

        {{NoteInfo}}
    </details>
</template>
<script setup lang="ts">
import type { components } from '#nuxt-api-party/jsonPlaceholder';
type Row = components["schemas"]["carInspectionSchema"]
const prop = defineProps<{
    NoteInfo: string
}>()
</script>