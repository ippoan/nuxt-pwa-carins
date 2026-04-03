<template>
  <div v-if="show">
    <div class="flex items-center gap-1">
      <UButton @click="() => window.location.reload()" size="md">更新</UButton>
      <UButton v-if="isSupported" @click="res.open()" size="md" class="hidden md:inline-flex">Open</UButton>
      <UButton v-if="!$pwa?.isPWAInstalled" @click="installApp" size="md">インストール</UButton>
      <UButton v-if="$pwa?.needRefresh" @click="$pwa?.updateServiceWorker" size="md">再インストール</UButton>
      <UButton to="/nfc" size="md" color="sky">NFC</UButton>
      <!-- PC: inline -->
      <div v-if="showQr" class="hidden md:flex relative ml-auto">
        <UButton size="md" color="gray" @click="qrOpen = !qrOpen">Android</UButton>
        <div v-if="qrOpen" class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg z-50 p-4 text-center w-48">
          <img src="/android-install-qr.png" alt="Android Install QR" class="w-full aspect-square" />
          <p class="text-xs mt-1">Android アプリ</p>
        </div>
      </div>
      <AuthToolbar class="hidden md:flex" :class="{ 'ml-auto': !showQr }" show-org-slug />
      <!-- Mobile: hamburger -->
      <div class="ml-auto relative md:hidden">
        <UButton size="md" color="gray" @click="menuOpen = !menuOpen">☰</UButton>
        <div v-if="menuOpen" class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg z-50 min-w-[200px] py-1">
          <a href="https://www.e-shaken.mlit.go.jp/etsuran01" target="_blank"
            class="block w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700">車検証アプリを開く</a>
          <AuthToolbar class="flex flex-col items-stretch [&>*]:w-full [&>*]:justify-start [&>*]:px-3 [&>*]:py-1.5 [&>*]:text-sm [&>*]:rounded-none [&>button]:hover:bg-gray-100 [&>button]:dark:hover:bg-gray-700" show-org-slug />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { AuthToolbar } from '@ippoan/auth-client'
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
const show = ref(false);
const menuOpen = ref(false);
const showQr = ref(false);
const qrOpen = ref(false);

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
  // PC からアクセス時のみ Android インストール QR を表示
  showQr.value = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
});
function closeMenu(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) menuOpen.value = false
}
onMounted(() => document.addEventListener('click', closeMenu))
onUnmounted(() => document.removeEventListener('click', closeMenu))

const route = useRoute();
const uuid = ref(route.query.uuid);
const message = ref(route.query.message);
</script>
