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
    preset: "cloudflare-module",
    prerender: {
      autoSubfolderIndex: false
    }
  },
  build: {
    transpile: ['@ippoan/auth-client'],
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
    // rust-alc-api バックエンド URL
    alcApiUrl: process.env.NUXT_ALC_API_URL || 'https://rust-alc-api-747065218280.asia-northeast1.run.app',
    // パブリック設定
    public: {
      apiBackend: 'rust-alc-api',
      authWorkerUrl: process.env.NUXT_PUBLIC_AUTH_WORKER_URL || '',
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || process.env.GITHUB_SHA || 'dev',
    },
  },

  vite: {
    // デプロイ版を JS バンドルに焼き込む (version-tag キャッシュバスト用、
    // plugins/version-reload.client.ts が参照。Refs ippoan/auth-worker#379)。
    // build 版とサーバ版 (上の appVersion) は同じ式で解決する — deploy 経路
    // (frontend-ci deploy_staging / preview 等) によって NUXT_PUBLIC_APP_VERSION
    // を build に渡さない場合があり、その時は全 CI step に入る GITHUB_SHA に
    // フォールバックする (--var で注入する github.sha と同一 40hex フォーマット)。
    // 両版が必ず同値になるので spurious reload も dev フォールバックによる no-op
    // も起きない。
    define: {
      __APP_BUILD_VERSION__: JSON.stringify(
        process.env.NUXT_PUBLIC_APP_VERSION || process.env.GITHUB_SHA || 'dev',
      ),
    },
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
    // ⚠️ TEMP (Refs #379 ③検証): version-reload plugin の発火を切り分けるため
    // 一時的に "prompt" にして SW 自動更新を止める (autoUpdate が毎回先着して
    // plugin が no-op になる問題の検証)。検証完了後に "autoUpdate" へ戻す。
    registerType: "prompt", // TEMP: was "autoUpdate" — revert after #379 ③検証

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
    workbox: {
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,ico,png,svg}'], // htmlはSSRなのでprecache対象外
    },
    devOptions: { // テスト用
      enabled: true,
      type: "module"
    },

  },
  modules: ["@vite-pwa/nuxt", "@vueuse/nuxt", "@nuxt/ui","nuxt-api-party"],
})