<script setup lang="ts">
import { VersionBadge, StagingFooter } from '@ippoan/auth-client'

const config = useRuntimeConfig()
const apiBase = config.alcApiUrl || config.public.alcApiUrl || ''
const { appVersion } = config.public
</script>

<template>
  <div class="grid-row-3">

    <NuxtPwaManifest />
    <NuxtLoadingIndicator />
    <Login />
    <NuxtPage />
    <!-- <NuxtRouteAnnouncer />
    <NuxtWelcome /> -->
    <VersionBadge :api-base="apiBase" :frontend-version="appVersion" />
  </div>
</template>
