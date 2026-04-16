<template>
    <div v-if="props.uuid && props.storageVerified !== false">

        <UButton @click="download" :ui="{rounded:'rounded-none'}">↓</UButton>
    </div>
    <div v-else-if="props.storageVerified === false">
        <UButton color="red" :ui="{rounded:'rounded-none'}" disabled title="ストレージにファイルが見つかりません">✕</UButton>
    </div>
    <div v-else>
        <UButton  color="gray" :ui="{rounded:'rounded-none'}">　</UButton>
    </div>
</template>
<script setup lang="ts">
// バックエンド切り替え対応のComposableを使用
const { download: downloadFile } = useFileDownload();

const props = defineProps<{
    uuid?: string,
    filename?: string | null,
    storageVerified?: boolean | null
}>();

async function download() {
    console.log("download:", props.uuid);
    await downloadFile(props.uuid, props.filename || "noname");
}

</script>