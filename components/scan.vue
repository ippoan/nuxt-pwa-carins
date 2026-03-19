<script setup lang="ts">
const emit = defineEmits<{
  change: []
}>()

const status = ref<'def' | 'scanning'>('def')
const serial = defineModel<string>('serial', { default: '' })
const type = defineModel<string>('type', { default: '' })
const timestamp = defineModel<string>('timestamp', { default: '' })

// Web NFC API が使える場合はそちらを使い、
// Android WebView (NDEFReader なし + Android bridge あり) の場合は WebSocket Bridge にフォールバック
const hasWebNfc = ref(false)
const hasAndroidBridge = ref(false)
const nfcSupported = ref(false)

onMounted(() => {
  hasWebNfc.value = 'NDEFReader' in window
  hasAndroidBridge.value = 'Android' in window
  nfcSupported.value = hasWebNfc.value || hasAndroidBridge.value
})

let ws: WebSocket | null = null

function connectBridge() {
  if (ws && ws.readyState === WebSocket.OPEN) return

  ws = new WebSocket('ws://127.0.0.1:9876')

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'nfc_read') {
        serial.value = data.employee_id
        type.value = 'nfc_read'
        timestamp.value = String(Date.now())
        status.value = 'def'
        emit('change')
      } else if (data.type === 'nfc_license_read') {
        serial.value = data.card_id
        type.value = data.card_type
        timestamp.value = String(Date.now())
        status.value = 'def'
        emit('change')
      }
    } catch (e) {
      console.error('NFC bridge message parse error:', e)
    }
  }

  ws.onclose = () => {
    // 切断時は3秒後に再接続
    if (status.value === 'scanning') {
      setTimeout(connectBridge, 3000)
    }
  }

  ws.onerror = (e) => {
    console.error('NFC bridge WebSocket error:', e)
  }
}

async function scan() {
  if (!nfcSupported.value) return

  if (hasAndroidBridge.value) {
    // Android WebSocket Bridge — NFC はネイティブ側で常時待ち受け
    serial.value = ''
    type.value = ''
    timestamp.value = ''
    status.value = 'scanning'
    connectBridge()
  } else if (hasWebNfc.value) {
    // Web NFC API (Chrome on Android / desktop)
    status.value = 'def'
    try {
      const ndef = new (window as any).NDEFReader()
      serial.value = ''
      type.value = ''
      timestamp.value = ''

      await ndef.scan()
      status.value = 'scanning'

      ndef.onreadingerror = (event: any) => {
        serial.value = 'Error: Cannot read NFC tag'
        type.value = event.type
        timestamp.value = event.timeStamp
      }

      ndef.onreading = (event: any) => {
        serial.value = event.serialNumber
        type.value = event.type
        timestamp.value = event.timeStamp
        status.value = 'def'
        emit('change')
      }
    } catch (error) {
      serial.value = 'Error!'
      status.value = 'def'
      console.error('NFC scan error:', error)
    }
  }
}

onUnmounted(() => {
  if (ws) {
    ws.close()
    ws = null
  }
})
</script>

<template>
  <div v-if="nfcSupported">
    <UButton
      v-if="status === 'def'"
      @click="scan"
      color="sky"
      size="lg"
      block
    >
      NFC スキャン開始
    </UButton>
    <UButton
      v-else
      @click="scan"
      color="orange"
      size="lg"
      block
      loading
    >
      タッチ待ち...
    </UButton>
  </div>
</template>
