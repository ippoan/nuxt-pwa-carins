/**
 * ファイル受信API（PWA share_target / ドロップゾーン用）
 * rust-alc-api REST 経由でファイルアップロード
 */

export default defineEventHandler(async (event) => {
    const ap = await readMultipartFormData(event)
    if (ap == undefined) {
        console.log("ap undefined")
        await sendRedirect(event, "/?message=" + encodeURIComponent("失敗しました"), 302)
        return
    }

    const multi = ap[0]
    console.log("multi:", multi.filename)

    const config = useRuntimeConfig(event)
    const backendUrl = config.alcApiUrl || 'https://rust-alc-api-747065218280.asia-northeast1.run.app'

    const content = Buffer.from(multi.data).toString("base64")

    // X-Tenant-ID を Cookie の JWT から取得（share_target はカスタムヘッダーなし）
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const cookieHeader = getHeader(event, 'cookie') || ''
    const tokenMatch = cookieHeader.match(/logi_auth_token=([^;]+)/)
    if (tokenMatch) {
        headers['Authorization'] = `Bearer ${tokenMatch[1]}`
        try {
            const payload = JSON.parse(atob(tokenMatch[1].split('.')[1]))
            const tenantId = payload.tenant_id || payload.org
            if (tenantId) headers['X-Tenant-ID'] = tenantId
        } catch { /* ignore */ }
    }
    // 明示的な Authorization / X-Tenant-ID ヘッダーがあればそちらを優先
    const authHeader = getHeader(event, 'authorization')
    if (authHeader) {
        headers['Authorization'] = authHeader
    }
    const tenantHeader = getHeader(event, 'x-tenant-id')
    if (tenantHeader) {
        headers['X-Tenant-ID'] = tenantHeader
    }

    try {
        const res: any = await $fetch(`${backendUrl}/api/files`, {
            method: "post",
            body: JSON.stringify({
                filename: multi.filename || "unnamed",
                type: multi.type || "application/octet-stream",
                content,
            }),
            headers,
        })
        console.log("file uploaded:", res?.uuid)

        if (1 in ap && ap[1].name == "from" && ap[1].data.toString() == "front") {
            return { uuid: res?.uuid || "", message: "送信完了しました" }
        } else {
            return { uuid: res?.uuid || "", message: "送信完了しました" }
        }
    } catch (e) {
        console.error("file upload failed:", e)
        if (1 in ap && ap[1].name == "from" && ap[1].data.toString() == "front") {
            return { uuid: "", message: "失敗しました" }
        }
        await sendRedirect(event, "/?message=" + encodeURIComponent("失敗しました"), 302)
    }
})
