# 車検証送信アプリ

Nuxt 3 PWAアプリケーション。車検証データをCloud Run gRPCサービスと連携して管理。

## アーキテクチャ

```
[ブラウザ] → [Nuxt Server (Cloudflare Pages)] → [Cloud Run gRPC Service]
                    ↓
            Connect RPC (grpc-web)
            + GCP IAM認証
```

## 技術スタック

- **フロントエンド**: Nuxt 3, Vue 3, Nuxt UI, TailwindCSS
- **PWA**: @vite-pwa/nuxt
- **gRPC通信**: @connectrpc/connect, @connectrpc/connect-web
- **Protocol Buffers**: @bufbuild/protobuf, @yhonda-ohishi-pub-dev/logi-proto
- **デプロイ**: Cloudflare Pages

## セットアップ

```bash
yarn install
```

## 環境変数

`.env`ファイルに以下を設定:

```env
# Cloud Run gRPC接続
NUXT_CLOUDRUN_URL=https://your-service.run.app
NUXT_GCP_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Cloudflare設定（既存）
NUXT_CF_ID=xxx
NUXT_CF_SECRET=xxx
NUXT_CF_SERVER=xxx
```

## 開発

```bash
yarn dev
```

## ビルド・デプロイ

```bash
# プレビュー環境
yarn preview

# 本番環境
yarn publish
```

## gRPC API

サーバーサイドで以下のエンドポイントを提供:

- `POST /api/grpc/car-inspections` - 車検証CRUD操作
- `POST /api/grpc/files` - ファイル操作

### 車検証API メソッド

| メソッド | 説明 |
|---------|------|
| `listCurrent` | 有効な車検証一覧 |
| `list` | 車検証一覧（フィルタ可） |
| `get` | 車検証詳細 |
| `create` | 車検証登録 |
| `delete` | 車検証削除 |
| `listExpiredOrAboutToExpire` | 期限切れ・期限間近一覧 |
| `listRenewTargets` | 継続検査対象一覧 |
