<script setup lang="ts">
const { appVersion } = useRuntimeConfig().public
</script>

<template>
  <div class="grid-row-3">

    <NuxtPwaManifest />
    <NuxtLoadingIndicator />
    <Login />
    <NuxtPage />
    <!-- <NuxtRouteAnnouncer />
    <NuxtWelcome /> -->
    <div class="version-badge">{{ appVersion }}</div>
  </div>
</template>
