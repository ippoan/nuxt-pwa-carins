<script setup lang="ts">
// LINE ログイン等 auth-worker リダイレクト後の callback ページ。
// 共通ロジック/UI は @ippoan/auth-client の AuthCallback に集約 (nuxt-dtako-admin /
// nuxt-trouble と同パターン)。URL fragment の #token を consumeFragment で保存し、
// 成功なら redirect-to へ遷移する。
//
// 招待UI (auth-worker admin-line-users-html) が LINE Login の遷移先を
// <origin>/auth/callback で組むため、carins にもこのルートが必要
// (従来 /top は carins に存在せず 404 になっていた。Refs ippoan/auth-worker LINE ログインループ調査)。
//
// carins は layouts/ を持たないため layout 指定はしない (app.vue 直下で描画)。
import { AuthCallback } from '@ippoan/auth-client'
</script>

<template>
  <AuthCallback redirect-to="/" login-path="/" />
</template>
