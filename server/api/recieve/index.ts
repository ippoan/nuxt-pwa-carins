export default defineEventHandler(async (event) => {

    const ap = await readMultipartFormData(event)
    if (ap != undefined) {
        const multi = ap[0]
        const blob = Buffer.from(multi["data"]).toString("base64")
        console.log("ap:",ap)
        // multi["blob"]=
        const sendData = {
            blob: blob,
            filename: multi.filename,
            type: multi.type,
        }
        console.log("multi:", multi)
        console.log(sendData)
        const { cfId, cfSecret,cfServer } = useRuntimeConfig(event)
        console.log("NUXT_CF_ID:", cfId)
        console.log("NUXT_CF_ID:", cfSecret)
        // console.log("JSON:", JSON.stringify(sendData))
        try{

            // const res: any = await $fetch("https://staging.hono-logi.mtamaramu.com/api/files", {
            const res: any = await $fetch(cfServer, {
                method: "post",
                // data: JSON.stringify(sendData),
                body: JSON.stringify(sendData),
                headers: {
                    "CF-Access-Client-Id": cfId,
                    "CF-Access-Client-Secret": cfSecret,
                    "Content-Type": "application/json"
                },
            })
            console.log("res:", JSON.stringify(res))
            // if(multi?.from){

            // }
            if(1 in ap && ap[1].name=="from" &&ap[1].data.toString()=="front"){
                return {uuid:res.uuid,message:"送信完了しました"}
            }else{

                await sendRedirect(event, "/?uuid="+res.uuid    +"&message="+encodeURIComponent("送信完了しました"), 302)
            }
            // await sendRedirect(event, "/?uuid=" + res.uuid, 302)
        }catch(e){
            await sendRedirect(event, "/?message="+encodeURIComponent("失敗しました"), 302)
        }
    }else{
        console.log("ap undefined")
        await sendRedirect(event, "/?message="+encodeURIComponent("失敗しました"), 302)
    }
    // re
    // const name = getRouterParam(event, 'name')
    // const file = getRouterParam(event, 'file')
    // console.log("name:", name)
    // console.log("file:", file)
    // console.log("ap:", ap)
    // console.log("lls")
    // console.log(event)
    // return `Hello, ${name}!`
    // return false
})