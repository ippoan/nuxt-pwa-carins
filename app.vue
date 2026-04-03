<script setup lang="ts">
import { VersionBadge } from '@ippoan/auth-client'

const { appVersion, authWorkerUrl } = useRuntimeConfig().public
const healthUrl = typeof authWorkerUrl === 'string' && authWorkerUrl ? `${authWorkerUrl}/api/health` : ''
</script>

<template>
  <div class="grid-row-3">

    <NuxtPwaManifest />
    <NuxtLoadingIndicator />
    <Login />
    <NuxtPage />
    <!-- <NuxtRouteAnnouncer />
    <NuxtWelcome /> -->
    <VersionBadge :health-url="healthUrl" :frontend-version="appVersion" />
  </div>
</template>
