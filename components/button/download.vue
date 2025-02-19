<template>
    <div v-if="props.uuid">

        <UButton @click="download" :ui="{rounded:'rounded-none'}">↓</UButton>
    </div>
    <div v-else>
        <UButton  color="gray" :ui="{rounded:'rounded-none'}">　</UButton>
    </div>
</template>
<script setup lang="ts">
import path from 'path';


async function download() {

    const data = await $jsonPlaceholder("/api/files/viewJson/{uuid}", { path: { uuid: props.uuid } })


    function B64toBlob(base64: string|null, type: string) {
        if(base64==null){
            return null
        }
        var bin = atob(base64.replace(/^.*,/, ''));
        var buffer = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) {
            buffer[i] = bin.charCodeAt(i);
        }
        // Blobを作成
        try {
            var blob = new Blob([buffer.buffer], {
                type: type
            });
        } catch (e) {
            var blob = new Blob()
            // return (await new Blob([]).arrayBuffer());
        }

        return blob;
    }

    const blob =B64toBlob(data.blob,data.type)
    if(blob ==null){
        return false
    }
    // const file =new File([blob],data.filename)
    console.log("download:", props.uuid)
    console.log(data)
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.target = '_blank';
    a.download = props.filename?props.filename:"noname";
    console.log("dd")
    a.click();

}
const props = defineProps<({
    uuid: string,
    filename:string|null
    // value: String,
})>()

</script>