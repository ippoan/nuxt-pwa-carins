import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    globals: true,
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['composables/**/*.ts', 'server/middleware/auth-logic.ts', 'server/api/proxy/proxy-logic.ts'],
      exclude: ['composables/useAuth.ts', 'composables/useApiBackend.ts'],
    },
  },
})
