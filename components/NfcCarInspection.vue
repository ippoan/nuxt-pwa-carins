<script setup lang="ts">
const { searchByNfcUuid, registerNfcTag, listNfcTags } = useNfcTag()
const { token } = useAuth()

// NFC scan state
const serial = ref('')
const type = ref('')
const timestamp = ref('')

// Search state
const phase = ref<'idle' | 'searching' | 'found' | 'not-found' | 'registering' | 'registered'>('idle')
const foundInspection = ref<Record<string, any> | null>(null)
const errorMessage = ref('')

// All inspections + NFC tag data
const allInspections = ref<Record<string, any>[]>([])
const taggedIds = ref<Set<number>>(new Set())
const loading = ref(true)
const searchQuery = ref('')

const nfcSupported = ref(typeof window !== 'undefined' && 'NDEFReader' in window)

// Load all inspections and NFC tags on mount
onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    const [inspRes, tagsRes] = await Promise.all([
      $fetch<{ car_inspections: any[] }>('/api/proxy/car-inspections/current', {
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
      }),
      listNfcTags(),
    ])
    allInspections.value = inspRes?.carInspections || []
    taggedIds.value = new Set((tagsRes as any[] || []).map((t: any) => t.carInspectionId))
  } catch (e: any) {
    errorMessage.value = e.message || 'Failed to load data'
  } finally {
    loading.value = false
  }
}

// Untagged inspections (NFC UUID 未登録)
const untaggedInspections = computed(() => {
  return allInspections.value.filter((ci: Record<string, any>) => !taggedIds.value.has(ci.id))
})

// Tagged inspections (NFC UUID 登録済み)
const taggedInspections = computed(() => {
  return allInspections.value.filter((ci: Record<string, any>) => taggedIds.value.has(ci.id))
})

// Owner filter
const ownerFilter = ref('')
const owners = computed(() => {
  const set = new Set<string>()
  for (const ci of allInspections.value) {
    const owner = ci.ownernameLowLevelChar || ci.OwnernameLowLevelChar
    if (owner) set.add(owner)
  }
  return [...set].sort()
})

// Region filter (車両番号の地名部分)
const regionFilter = ref('')
const regions = computed(() => {
  const set = new Set<string>()
  for (const ci of allInspections.value) {
    const carNo = ci.entryNoCarNo || ci.EntryNoCarNo || ''
    // 全角スペースか半角スペースの前が地名
    const match = carNo.match(/^([^\s\u3000]+)/)
    if (match) set.add(match[1])
  }
  return [...set].sort()
})

// Filter by search query + owner + region
function applyFilters(list: Record<string, any>[]) {
  let result = list
  if (ownerFilter.value) {
    result = result.filter((ci) => {
      const owner = ci.ownernameLowLevelChar || ci.OwnernameLowLevelChar || ''
      return owner === ownerFilter.value
    })
  }
  if (regionFilter.value) {
    result = result.filter((ci) => {
      const carNo = ci.entryNoCarNo || ci.EntryNoCarNo || ''
      return carNo.startsWith(regionFilter.value)
    })
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((ci) => Object.values(ci).some((v) => String(v).toLowerCase().includes(q)))
  }
  return result
}

const filteredUntagged = computed(() => applyFilters(untaggedInspections.value))
const filteredTagged = computed(() => applyFilters(taggedInspections.value))

// NFC scan complete → search
async function onNfcChange() {
  if (!serial.value) return

  phase.value = 'searching'
  errorMessage.value = ''
  foundInspection.value = null

  try {
    const result = await searchByNfcUuid(serial.value)
    if (result.carInspection) {
      foundInspection.value = result.carInspection
      phase.value = 'found'
    } else {
      phase.value = 'not-found'
    }
  } catch (e: any) {
    errorMessage.value = e.message || 'Search failed'
    phase.value = 'idle'
  }
}

// Register NFC tag to selected car inspection
async function registerTag(carInspectionId: number) {
  if (!serial.value) {
    errorMessage.value = '先に NFC スキャンしてください'
    return
  }
  phase.value = 'registering'
  try {
    await registerNfcTag(serial.value, carInspectionId)
    const result = await searchByNfcUuid(serial.value)
    foundInspection.value = result.carInspection || null
    phase.value = 'registered'
    await loadAll()
  } catch (e: any) {
    errorMessage.value = e.message || 'Registration failed'
    phase.value = 'idle'
  }
}

function reset() {
  phase.value = 'idle'
  serial.value = ''
  foundInspection.value = null
  errorMessage.value = ''
}

// Tab
const activeTab = ref<'untagged' | 'tagged'>('untagged')
</script>

<template>
  <div class="p-2">
    <!-- NFC Scan Section -->
    <div v-if="nfcSupported" class="mb-4 p-3 border-2 border-dashed border-sky-400 dark:border-sky-600 rounded-lg text-center">
      <div class="text-lg font-bold mb-2">NFC 車検証スキャン</div>
      <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">車検証の IC チップにスマホをかざしてください</div>
      <Scan v-model:serial="serial" v-model:type="type" v-model:timestamp="timestamp"
        @change="onNfcChange">
        <template #default>
        </template>
      </Scan>
      <!-- スキャン結果 -->
      <div v-if="serial && phase === 'idle'" class="mt-2 text-xs text-gray-400">UUID: {{ serial }}</div>
    </div>
    <div v-else class="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-sm text-gray-500">
      この端末は NFC に対応していません。下の一覧から車検証の NFC 登録状況を確認できます。
    </div>

    <!-- Error -->
    <div v-if="errorMessage" class="text-red-500 my-2 text-sm">{{ errorMessage }}</div>

    <!-- Searching -->
    <div v-if="phase === 'searching'" class="my-3 text-center text-sky-500 font-bold">検索中...</div>

    <!-- Found -->
    <div v-if="phase === 'found' && foundInspection" class="my-3 p-3 bg-green-50 dark:bg-green-900 rounded-lg border border-green-300 dark:border-green-700">
      <div class="text-green-700 dark:text-green-300 font-bold text-lg mb-2">登録済み</div>
      <table class="text-sm">
        <tr><td class="pr-2 text-gray-500">車両番号</td><td class="font-bold">{{ foundInspection.entryNoCarNo }}</td></tr>
        <tr><td class="pr-2 text-gray-500">有効期限</td><td>{{ foundInspection.twodimensionCodeInfoValidPeriodExpirdate }}</td></tr>
        <tr><td class="pr-2 text-gray-500">所有者</td><td>{{ foundInspection.ownernameLowLevelChar }}</td></tr>
        <tr><td class="pr-2 text-gray-500">使用者</td><td>{{ foundInspection.usernameLowLevelChar }}</td></tr>
        <tr><td class="pr-2 text-gray-500">車台番号</td><td>{{ foundInspection.carNo }}</td></tr>
        <tr><td class="pr-2 text-gray-500">型式</td><td>{{ foundInspection.model }}</td></tr>
      </table>
      <UButton class="mt-3" size="sm" @click="reset">閉じる</UButton>
    </div>

    <!-- Registered success -->
    <div v-if="phase === 'registered' && foundInspection" class="my-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-300 dark:border-blue-700">
      <div class="text-blue-700 dark:text-blue-300 font-bold text-lg mb-2">登録完了</div>
      <table class="text-sm">
        <tr><td class="pr-2 text-gray-500">車両番号</td><td class="font-bold">{{ foundInspection.entryNoCarNo }}</td></tr>
        <tr><td class="pr-2 text-gray-500">所有者</td><td>{{ foundInspection.ownernameLowLevelChar }}</td></tr>
      </table>
      <UButton class="mt-3" size="sm" @click="reset">閉じる</UButton>
    </div>

    <!-- Not found after scan -->
    <div v-if="phase === 'not-found'" class="my-3 p-3 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg border border-yellow-300 dark:border-yellow-700">
      <div class="text-yellow-600 dark:text-yellow-400 font-bold">NFC UUID 未登録</div>
      <div class="text-xs text-gray-500 mt-1">UUID: {{ serial }}</div>
      <div class="text-sm mt-1">下の未登録一覧から車検証を選んで「登録」してください</div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-1 mb-2">
      <select v-model="regionFilter" class="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600">
        <option value="">全地域</option>
        <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
      </select>
      <select v-model="ownerFilter" class="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 flex-1 min-w-0">
        <option value="">全所有者</option>
        <option v-for="o in owners" :key="o" :value="o">{{ o }}</option>
      </select>
      <UInput v-model="searchQuery" placeholder="検索..." class="flex-1 min-w-[100px]" size="sm" />
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-2">
      <UButton :variant="activeTab === 'untagged' ? 'solid' : 'outline'" size="sm"
        @click="activeTab = 'untagged'">
        未登録 ({{ filteredUntagged.length }})
      </UButton>
      <UButton :variant="activeTab === 'tagged' ? 'solid' : 'outline'" size="sm"
        @click="activeTab = 'tagged'">
        登録済み ({{ filteredTagged.length }})
      </UButton>
    </div>

    <div v-if="loading" class="my-2">読み込み中...</div>

    <!-- Untagged list -->
    <div v-if="!loading && activeTab === 'untagged'" class="max-h-[60vh] overflow-y-auto">
      <table class="w-full text-sm border-collapse">
        <thead class="sticky top-0 bg-white dark:bg-gray-800 z-10">
          <tr>
            <th class="border px-1 py-1 text-left">車両番号</th>
            <th class="border px-1 py-1 text-left">有効期限</th>
            <th class="border px-1 py-1 text-left">所有者</th>
            <th class="border px-1 py-1" v-if="serial">登録</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ci in filteredUntagged" :key="ci.id"
            class="hover:bg-gray-100 dark:hover:bg-gray-700">
            <td class="border px-1 py-1">{{ ci.entryNoCarNo }}</td>
            <td class="border px-1 py-1">{{ ci.twodimensionCodeInfoValidPeriodExpirdate }}</td>
            <td class="border px-1 py-1">{{ ci.ownernameLowLevelChar }}</td>
            <td class="border px-1 py-1" v-if="serial">
              <UButton size="xs" @click="registerTag(ci.id)">登録</UButton>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredUntagged.length === 0" class="text-center text-gray-500 py-4">
        未登録の車検証はありません
      </div>
    </div>

    <!-- Tagged list -->
    <div v-if="!loading && activeTab === 'tagged'" class="max-h-[60vh] overflow-y-auto">
      <table class="w-full text-sm border-collapse">
        <thead class="sticky top-0 bg-white dark:bg-gray-800 z-10">
          <tr>
            <th class="border px-1 py-1 text-left">車両番号</th>
            <th class="border px-1 py-1 text-left">有効期限</th>
            <th class="border px-1 py-1 text-left">所有者</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ci in filteredTagged" :key="ci.id"
            class="hover:bg-gray-100 dark:hover:bg-gray-700">
            <td class="border px-1 py-1">{{ ci.entryNoCarNo }}</td>
            <td class="border px-1 py-1">{{ ci.twodimensionCodeInfoValidPeriodExpirdate }}</td>
            <td class="border px-1 py-1">{{ ci.ownernameLowLevelChar }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredTagged.length === 0" class="text-center text-gray-500 py-4">
        登録済みの車検証はありません
      </div>
    </div>
  </div>
</template>
