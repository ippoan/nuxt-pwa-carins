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
})
