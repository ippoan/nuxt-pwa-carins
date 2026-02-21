<template>
  <div v-if="show">
    <div class="flex">
      <UButton to="/" class="mr-1">更新</UButton>
      <div v-if="isSupported">
        <UButton @click="res.open()" class="mr-1">Open</UButton>
        <!-- test -->
      </div>
      <div v-if="!$pwa?.isPWAInstalled">
        <UButton @click="installApp">インストール</UButton>
      </div>
      <div v-if="$pwa?.needRefresh">
        <UButton @click="$pwa?.updateServiceWorker">再インストール</UButton>
      </div>
      <UButton color="gray" @click="handleLogout" class="ml-auto">Logout</UButton>
    </div>
    <!-- <div>$pwa:{{ $pwa }}</div>
    <div>$pwa?.isPWAInstalled:{{ $pwa?.isPWAInstalled }}</div>
    index
    {{ res }}
    <div>fileRef:{{ fileRef }}</div> -->
    <div>uuid:{{ uuid }}</div>
    <div>message:{{ message }}</div>
    <!-- <div>route.params:{{ route.params }}</div> -->
  </div>
</template>
<script setup lang="ts">
import { useFileSystemAccess } from "@vueuse/core";
declare var window: Window;
interface Window {
  phantom: any;
  launchQueue: LaunchQueue;
}
interface LaunchQueue {
  // undefined setConsumer(LaunchConsumer consumer);
  // setConsumer:()=>LaunchParams
  setConsumer: (callback: (callback: LaunchParams) => void) => void;
  // (setConsumer: any): void;
}

interface LaunchParams {
  readonly targetURL: string;
  readonly files: Array<FileSystemHandle>;
}
interface FileSystemHandle {
  getFile(): Promise<File>;
}
const { logout } = useAuth()
function handleLogout() {
  logout()
}
const show = ref(false);

const fileRef = ref();

const installed = ref(false);
// const message = ref("");
const dataType = ref("Text") as Ref<"Text" | "ArrayBuffer" | "Blob">;
const { $pwa } = useNuxtApp();

async function installApp() {
  console.log("install app");
  const ls = await $pwa?.install();
  console.log("$pwa:", $pwa);
  console.log("ls:", ls);
  // window.deferredPrompt.prompt();
}
const { isSupported } = useFileSystemAccess();
const res = useFileSystemAccess({
  dataType,
  types: [
    {
      description: "text",
      accept: {
        // 'text/plain': ['.txt', '.html'],
        "application/json": [".json"],
        "application/pdf": [".pdf"],
      },
    },
  ],
  excludeAcceptAllOption: true,
});

watch(
  () => fileRef.value,
  (el) => {
    console.log("ff:", el);
  }
);
onMounted(() => {
  console.log("value", fileRef.value);

  if ($pwa != undefined) {
    if ($pwa.offlineReady) message.value = "App ready to work offline";
    installed.value = $pwa?.isPWAInstalled;
  } else {
    installed.value = false;
  }
  const { upload } = useFileUpload();
  if ("launchQueue" in window) {
    if (window.launchQueue) {
      window.launchQueue.setConsumer(async (launchP) => {
        if (launchP.files && launchP.files.length) {
          launchP.files.forEach(async (fileOne) => {
            const file = await fileOne.getFile();
            const res = await upload(file, "front");

            if (res != undefined && res.uuid) {
              uuid.value = res.uuid;
            }
            if (res != undefined && res.message) {
              message.value = res.message;
            }
          });
        }
      });
    }
  }
  show.value = true;
});
const route = useRoute();
const uuid = ref(route.query.uuid);
const message = ref(route.query.message);
</script>
