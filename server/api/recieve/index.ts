/**
 * ファイル受信API（PWA share_target / ドロップゾーン用）
 * Cloudflare (hono-logi) と rust-logi (cf-grpc-proxy経由) に対応
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
    const backend = config.public.apiBackend

    if (backend === 'rust-logi') {
        // rust-logi: Service Binding経由でcf-grpc-proxyにアップロード
        try {
            const { cloudflare } = event.context
            if (!cloudflare?.env?.GRPC_PROXY_SERVICE) {
                throw new Error('GRPC_PROXY_SERVICE binding not available')
            }

            const blobBase64 = Buffer.from(multi.data).toString('base64')
            const targetUrl = 'https://cf-grpc-proxy.workers.dev/logi.files.FilesService/CreateFile'
            const response = await cloudflare.env.GRPC_PROXY_SERVICE.fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Connect-Protocol-Version': '1',
                },
                body: JSON.stringify({
                    filename: multi.filename || 'unnamed',
                    type: multi.type || 'application/octet-stream',
                    blobBase64: blobBase64,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Upload failed: ${response.status} ${errorText}`)
            }

            const result = await response.json() as { file?: { uuid?: string } }
            const uuid = result?.file?.uuid || ''
            return { uuid, message: '送信完了しました' }
        } catch (e) {
            console.error("rust-logi upload failed:", e)
            if (1 in ap && ap[1].name == "from" && ap[1].data.toString() == "front") {
                return { uuid: "", message: "失敗しました" }
            }
            await sendRedirect(event, "/?message=" + encodeURIComponent("失敗しました"), 302)
        }
    } else {
        // cloudflare / cloudrun: 既存のhono-logiへのアップロード
        const blob = Buffer.from(multi.data).toString("base64")
        const sendData = {
            blob: blob,
            filename: multi.filename,
            type: multi.type,
        }
        const { cfId, cfSecret, cfServer } = useRuntimeConfig(event)
        try {
            const res: any = await $fetch(cfServer, {
                method: "post",
                body: JSON.stringify(sendData),
                headers: {
                    "CF-Access-Client-Id": cfId,
                    "CF-Access-Client-Secret": cfSecret,
                    "Content-Type": "application/json"
                },
            })
            console.log("atf post")
            if (1 in ap && ap[1].name == "from" && ap[1].data.toString() == "front") {
                console.log("送信完了しました")
                return { uuid: "", message: "送信完了しました" }
            } else {
                console.log("送信完了しました2")
                return { uuid: "", message: "送信完了しました" }
            }
        } catch (e) {
            console.log("失敗しました 302")
            console.log(JSON.stringify(e))
            await sendRedirect(event, "/?message=" + encodeURIComponent("失敗しました"), 302)
        }
    }
})
