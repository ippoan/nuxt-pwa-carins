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

## 技術制約

- **認証**: GCP IAM認証（サービスアカウントキーからIDトークン生成）
- `build.transpile`に`@yhonda-ohishi-pub-dev/logi-proto`, `@bufbuild/protobuf`, `@connectrpc/connect`, `@connectrpc/connect-web`が必要（ESMモジュール解決のため）

## コーディング規約

- TypeScript使用
- Vueコンポーネントは`<script setup lang="ts">`形式
- propsはオプショナル（`?`）を適切に設定し、undefined警告を避ける

詳細（アーキテクチャ・主要ファイル・gRPC通信・環境変数）は nuxt-pwa-carins-map skill を参照。
