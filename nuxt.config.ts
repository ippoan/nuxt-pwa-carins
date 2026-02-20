import { hostname } from "os"

// https://nuxt.com/docs/api/configuration/nuxt-config
console.log("env.PWA_TITLE",process.env.PWA_TITLE)
console.log("env.NUXT_CF_SERVER",process.env.stage=="preview"?process.env.NUXT_CF_SERVER_PREVIEW:process.env.NUXT_CF_SERVER_PRODUCT)
const appName=process.env.stage=="preview"?'ST車検証送信アプリ':'車検証送信アプリ'
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  // ssr: false,
  
  // ssr:  true,
  // target: "static",
  nitro:{
    // preset:"cloudflare-pages",
    prerender: {
      autoSubfolderIndex: false
    }
  },
  build: {
    transpile: ['@yhonda-ohishi-pub-dev/logi-proto', '@bufbuild/protobuf', '@connectrpc/connect', '@connectrpc/connect-web'],
  },
  devServer: {
    host: '0.0.0.0',
    // https: {
    //   // key:"./testuriage.mtamaramu.com-key.pem",
    //   // cert:"testuriage.mtamaramu.com.pem"
    //   key: "/etc/letsencrypt/live/test.mtamaramu.com/privkey.pem",
    //   cert: "/etc/letsencrypt/live/test.mtamaramu.com/cert.pem"
    // },
    // url:"https://uriage.ohishiunyusouko.com"
  },
  runtimeConfig: {
    // Cloudflare設定（既存）
    cfId: process.env.NUXT_CF_ID,
    cfSecret: process.env.NUXT_CF_SECRET,
    cfServer: process.env.NUXT_CF_SERVER,
    // Cloud Run設定（新規）
    cloudrunUrl: process.env.NUXT_CLOUDRUN_URL,
    gcpServiceAccountKey: process.env.NUXT_GCP_SERVICE_ACCOUNT_KEY,
    // パブリック設定
    public: {
      apiBackend: process.env.API_BACKEND || 'cloudflare',
      authWorkerUrl: process.env.NUXT_PUBLIC_AUTH_WORKER_URL || '',
    },
  },

  vite: {
    server: {
      hmr: {
        protocol: "wss",
        clientPort: 443,
        // host:"test_api.mtamaramu.com",
        // path: "hmr/",
      },
    },
  },

  hooks: {
    ///https://zenn.dev/coedo/scraps/b0d1ae5de09f63
    //https://zenn.dev/wwwave/articles/cc9d078fbf94fa
    'vite:extendConfig'(viteInlineConfig: any, env: any) {
      viteInlineConfig.server = {
        ...viteInlineConfig.server,
        hmr: { // ここに書く
          protocol: 'wss',
          path: 'hmr/',
          // hostname:"test_api.mtamaramu.com",
          clientPort: 443,
          // port: 443,
        },
      }
    },
  },
  app: {
    head: {
      meta: [
        { name: "theme-color", content: "#326CB3" },
      ],
      link: [
        { rel: 'icon', href: `/favicon.ico`, sizes: "48x48" },
        { rel: 'apple-touch-icon', href: `/apple-touch-icon-180x180.png` },
      ],
    },
  },
  apiParty: {
    endpoints: {
      jsonPlaceholder: {
        url: `${process.env.NUXT_HONO_LOGI_URL}`,
        schema: `${process.env.NUXT_HONO_LOGI_SCHEMA}`,
        // Global headers sent with each request
        headers: {
          "CF-Access-Client-Id": `${process.env.CF_ACCESS_CLIENT_ID!}`,
          "CF-Access-Client-Secret":`${process.env.CF_ACCESS_CLIENT_SECRET}`
        }
      }
    }
  },


  pwa: {
    client: { installPrompt: true },
    registerType: "autoUpdate", // 多分なくてもよい

    manifest: {
      name: appName,
      description: "アプリ説明",
      theme_color: "#326CB3", // テーマカラー
      lang: "ja",
      short_name: appName,
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      share_target: {
        "action": "/api/recieve",
        "method": "POST",
        "enctype": "multipart/form-data",
        "params": {
          "files": [
            {
              "name": "records",
              "accept": ["text/csv", ".csv"]
            },
            {
              "name": "json",
              "accept": ["application/json", ".json", "text/json"]
            },
            {
              "name": "pdf",
              "accept": ["application/pdf", ".pdf", "text/pdf",]
            },
          ]
        }
      },
      file_handlers: [
        {
          "action": "/",
          "accept": {
            "application/json": [".json"],
            "text/csv": [".csv"],
            "application/pdf": [".pdf"],
          },
          // "launch_type": "single-client"
        }
      ],
      icons: [
        {
          "src": "pwa-64x64.png",
          "sizes": "64x64",
          "type": "image/png"
        },
        {
          "src": "pwa-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "pwa-512x512.png",
          "sizes": "512x512",
          "type": "image/png"
        },
        {
          "src": "maskable-icon-512x512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "maskable"
        }
      ],
    },
    workbox: { // なんか必要
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,ico,png,svg}'] //https://vite-pwa-org.netlify.app/guide/service-worker-precache.html
    },
    devOptions: { // テスト用
      enabled: true,
      type: "module"
    },

  },
  modules: ["@vite-pwa/nuxt", "@vueuse/nuxt", "@nuxt/ui","nuxt-api-party"],
})