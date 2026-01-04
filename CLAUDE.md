# CLAUDE.md

このファイルはClaude Codeがこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

車検証データを管理するNuxt 3 PWAアプリケーション。Cloudflare Pagesにデプロイし、Cloud Run上のgRPCサービスと通信する。

## 開発コマンド

```bash
yarn dev          # 開発サーバー起動
yarn build        # 本番ビルド
yarn preview      # ステージング環境デプロイ
yarn publish      # 本番環境デプロイ
```

## アーキテクチャ

### gRPC通信

- **Connect RPC**: `@connectrpc/connect` + `@connectrpc/connect-web`でgrpc-web通信
- **認証**: GCP IAM認証（サービスアカウントキーからIDトークン生成）
- **Proto定義**: `@yhonda-ohishi-pub-dev/logi-proto`パッケージ

### 主要ファイル

| ファイル | 役割 |
|---------|------|
| `server/utils/grpc-client.ts` | Connect RPCクライアント生成 |
| `server/utils/cloudrun-auth.ts` | GCP IAM認証・IDトークン取得 |
| `server/api/grpc/car-inspections.ts` | 車検証API プロキシエンドポイント |
| `server/api/grpc/files.ts` | ファイルAPI プロキシエンドポイント |
| `composables/useCarInspectionData.ts` | 車検証データComposable |
| `composables/useFilesData.ts` | ファイルデータComposable |

### nuxt.config.ts 注意点

- `build.transpile`に`@yhonda-ohishi-pub-dev/logi-proto`, `@bufbuild/protobuf`, `@connectrpc/connect`, `@connectrpc/connect-web`が必要（ESMモジュール解決のため）

## コーディング規約

- TypeScript使用
- Vueコンポーネントは`<script setup lang="ts">`形式
- propsはオプショナル（`?`）を適切に設定し、undefined警告を避ける

## 環境変数

```env
NUXT_CLOUDRUN_URL          # Cloud Run gRPCサービスURL
NUXT_GCP_SERVICE_ACCOUNT_KEY  # GCPサービスアカウントキー（JSON）
```
