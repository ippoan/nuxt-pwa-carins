<script setup>

import { ref, onMounted } from 'vue'
// import{ConfigurableNavigator } from "vueuse/core"

// import {config}
import sound from '../public/決定ボタンを押す1 (1).mp3'
// const serial = ref('')
const props = defineProps({
    BtnName: String
});
// const emits = defineEmits<{(e: 'change', value?: string): void}>()

const emit = defineEmits(['change'])
const status = ref("def");

// const nfcPermissionStatus = ref("nfcPermissionStatus");

const serial = defineModel("serial", { default: "" })
const type = defineModel("type", { default: "" })
const timestamp = defineModel("timestamp", { default: "" })

function Scan(e) {
    console.log("scan")
    status.value = 'def'
    alert("scan")
    // onMounted(() => {

    const audio = new Audio(sound)
    // if(defaultNavigator){

    navigator.permissions.query({ name: "nfc" });

    // navigator.permissions.query({ name: "nfc" }).then((e) => {
    //     nfcPermissionStatus.value = e.state;
    // });
    try {
        const ndef = new NDEFReader();
        serial.value = "";
        type.value = "";
        timestamp.value = null;
        ndef.scan().then(() => {



            status.value = "scanning"
            console.log("User clicked scan button");
            console.log("Scan started successfully.");
            ndef.onreadingerror = (event) => {
                console.log(
                    "Error! Cannot read data from the NFC tag. Try a different one?",
                );
                serial.value = "Error! Cannot read data from the NFC tag. Try a different one?";
                type.value = event.type;
                timestamp.value = event.timeStamp;
            };
            ndef.onreading = (event) => {
                console.log("NDEF message read.");
                alert(JSON.stringify(event));
                alert(event.serialNumber)
                serial.value = event.serialNumber;
                type.value = event.type;
                timestamp.value = event.timeStamp;
                console.log(serial);
                audio.play()

                emit('change')
                //https://www.ccbaxy.xyz/blog/2020/07/11/js1/
            };
        }).catch((error) => {
            alert("lst " + error);

            status.value = "def";
            serial.value = "Error!";
            console.log("Argh! " + error);
        }).finally(() => {

            console.log("NDEFReader finished");
        });

    } catch (error) {
        serial.value = "Error!";
        status.value = "def";
        alert("lst1 " + error);
        console.log("Argh! " + error);

    } finally {
        console.log("fin")
        // status.value = "def";
    }

    if (nfcPermissionStatus.state === "granted") {
        // NFC access was previously granted, so we can start NFC scanning now.
        startScanning();
    } else {
        // Show a "scan" button.
        document.querySelector("#scanButton").style.display = "block";
        document.querySelector("#scanButton").onclick = event => {
            // Prompt user to allow UA to send and receive info when they tap NFC devices.
            startScanning();
        };
    }

}
// }
// });



</script>

<template>
    <div>

        serial:{{ serial }}
    </div>
    {{ status }}
    <div id="scanBtn">

        <button v-if="status == 'def'" @click="Scan">{{ props.BtnName }}</button>
        <button v-else @click="Scan">Scanning</button>
    </div>
</template>