<script setup lang="ts">
const emit = defineEmits<{
  change: []
}>()

const status = ref<'def' | 'scanning'>('def')
const serial = defineModel<string>('serial', { default: '' })
const type = defineModel<string>('type', { default: '' })
const timestamp = defineModel<string>('timestamp', { default: '' })

const nfcSupported = ref(typeof window !== 'undefined' && 'NDEFReader' in window)

async function scan() {
  if (!nfcSupported.value) return

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
