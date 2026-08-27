/**
 * ファイル受信API（PWA share_target / ドロップゾーン用）
 * /api/recieve → auth-worker /alc-proxy/api/files → rust-alc-api の POST /api/files
 *
 * #54: 2026-07 に rust-alc-api の Cloud Run が --no-allow-unauthenticated へ
 * ロックダウンされ、Google 署名の OIDC ID token が無い呼び出しはプラットフォーム
 * 層で 403 になった。本経路は cookie の browser JWT を Authorization に載せて
 * rust-alc-api を直叩きしていたため (= OIDC ID token ではない)、アップロードが
 * 全滅していた。読み取り経路 (/api/proxy/*) は #434 で auth-worker 集約済みだった
 * ので、書き込みの本経路だけが移行から取り残されていた形。
 *
 * 方式は /api/proxy/* と同じ (方式 B): OIDC mint と identity 注入は
 * auth-worker `/alc-proxy/*` に集約し、consumer は AUTH_WORKER service binding へ
 * thin-forward するだけ。run.invoker の SA key は auth-worker にしか bind されて
 * いないので、carins 側が自力で OIDC token を作ることはできない。
 *
 * consumer が付けるのは X-Alc-Proxy-Secret (= INTERNAL_SHARED_SECRET、consumer
 * proof) + X-Alc-Proxy-Origin + browser JWT のみ。X-Tenant-ID / X-User-* は
 * auth-worker が **検証済み JWT から注入する** ので consumer は載せない (#434)。
 *
 * INTERNAL_SHARED_SECRET は Secrets Store binding (.get()) のため route 側で
 * resolve する。secret / AUTH_WORKER binding 未設定は fail-closed で 503。
 *
 * #290 Phase 4: アップロード前に requireAuth (auth-worker introspect) で署名 +
 * APP_TENANT_ACL を検証する。share_target も browser JWT (logi_auth_token cookie)
 * を持つ人間の操作なので、machine 経路 (/api/device-upload) とは別に
 * ユーザー経路の /alc-proxy を使う。
 */
import { requireAuth } from '../../utils/auth'
import { cfEnv, resolveSecret } from '../../utils/cf-env'

export default defineEventHandler(async (event) => {
    // 認証 gate (cookie/Bearer を introspect 検証)。body 読取前に弾く。
    await requireAuth(event)

    const ap = await readMultipartFormData(event)
    if (ap == undefined) {
        console.log("ap undefined")
        await sendRedirect(event, "/?message=" + encodeURIComponent("失敗しました"), 302)
        return
    }

    const multi = ap[0]
    console.log("multi:", multi.filename)

    const env = cfEnv(event)
    const sharedSecret = await resolveSecret(env.INTERNAL_SHARED_SECRET)
    if (!sharedSecret) {
        throw createError({
            statusCode: 503,
            statusMessage: 'INTERNAL_SHARED_SECRET binding が未設定です',
        })
    }
    const authWorker = env.AUTH_WORKER as { fetch: typeof fetch } | undefined
    if (!authWorker) {
        // 方式 B は AUTH_WORKER service binding 経由の forward が必須 (fail-closed)。
        throw createError({
            statusCode: 503,
            statusMessage: 'AUTH_WORKER service binding が未設定です',
        })
    }
    const authWorkerUrl =
        typeof env.NUXT_PUBLIC_AUTH_WORKER_URL === 'string' && env.NUXT_PUBLIC_AUTH_WORKER_URL
            ? env.NUXT_PUBLIC_AUTH_WORKER_URL
            : 'https://auth.ippoan.org'

    const content = Buffer.from(multi.data).toString("base64")

    // browser JWT は Cookie から取る（share_target はカスタムヘッダーなし）。
    // 明示的な Authorization ヘッダーがあればそちらを優先。
    const cookieHeader = getHeader(event, 'cookie') || ''
    const tokenMatch = cookieHeader.match(/logi_auth_token=([^;]+)/)
    const authHeader = getHeader(event, 'authorization')
    const cookieToken = authHeader
        ? authHeader.replace(/^Bearer\s+/i, '')
        : tokenMatch
            ? tokenMatch[1]
            : ''

    const isFront = 1 in ap && ap[1].name == "from" && ap[1].data.toString() == "front"

    if (!cookieToken) {
        // /alc-proxy は browser JWT 必須。取れなければ forward せず失敗に倒す。
        console.error("file upload failed: browser JWT (logi_auth_token) が取得できませんでした")
        if (isFront) {
            return { uuid: "", message: "失敗しました" }
        }
        await sendRedirect(event, "/?message=" + encodeURIComponent("失敗しました"), 302)
        return
    }

    try {
        const res = await authWorker.fetch(`${authWorkerUrl}/alc-proxy/api/files`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // consumer worker proof。auth-worker が constant-time で検証する。
                'X-Alc-Proxy-Secret': sharedSecret,
                // ACL 判定に使う app origin。
                'X-Alc-Proxy-Origin': getRequestURL(event).origin,
                // Cookie 由来の browser JWT。auth-worker がこれを検証して
                // X-Tenant-ID / X-User-* を注入する。
                // ★ X-Tenant-ID を consumer 側で載せてはいけない (#434 で塞いだ
                //   client 由来 tenant 詐称の穴を開け直すことになる)。
                Authorization: `Bearer ${cookieToken}`,
            },
            body: JSON.stringify({
                filename: multi.filename || "unnamed",
                type: multi.type || "application/octet-stream",
                content,
            }),
        })

        if (!res.ok) {
            // 切り分けのため status と body を必ず残す (502 としか出ないと
            // 上流が 403 なのか 401 なのか分からず調査に時間を取られる)。
            const body = await res.text().catch(() => '<body 読取失敗>')
            console.error(`file upload failed: /alc-proxy/api/files ${res.status} ${res.statusText} body=${body}`)
            if (isFront) {
                return { uuid: "", message: "失敗しました" }
            }
            await sendRedirect(event, "/?message=" + encodeURIComponent("失敗しました"), 302)
            return
        }

        const json: any = await res.json().catch(() => null)
        console.log("file uploaded:", json?.uuid)

        return { uuid: json?.uuid || "", message: "送信完了しました" }
    } catch (e) {
        console.error("file upload failed:", e)
        if (isFront) {
            return { uuid: "", message: "失敗しました" }
        }
        await sendRedirect(event, "/?message=" + encodeURIComponent("失敗しました"), 302)
    }
})
