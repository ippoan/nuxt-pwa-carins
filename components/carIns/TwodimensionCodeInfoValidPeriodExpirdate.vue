<template>
    <div>
        {{ prop.TwodimensionCodeInfoValidPeriodExpirdate.slice(0,2)+"-"+prop.TwodimensionCodeInfoValidPeriodExpirdate.slice(2,4)+"-"+prop.TwodimensionCodeInfoValidPeriodExpirdate.slice(4,6) }}
    </div>
</template>
<script setup lang="ts">
import type { components } from '#nuxt-api-party/jsonPlaceholder';
const prop = defineProps<{
    TwodimensionCodeInfoValidPeriodExpirdate: string
}>()
</script>