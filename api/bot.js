const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay } = require("@whiskeysockets/baileys");
const Pino = require('pino');

const app = express();
app.use(cors());
app.use(express.json());

let sock; // global socket

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info_baileys");

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: Browsers.macOS("Safari"),
        logger: Pino({ level: "fatal" })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if(qr) console.log("QR Code ready (scan di WA Web)");
        if(connection === "open") console.log("✅ Connected to WhatsApp!");
    });

    // Command Listener
    sock.ev.on('messages.upsert', async (msgUpdate) => {
        const messages = msgUpdate.messages;
        if(!messages) return;
        for(const m of messages){
            if(!m.message || m.key.fromMe) continue;
            const text = m.message.conversation || m.message.extendedTextMessage?.text;
            const from = m.key.remoteJid;
            if(!text) continue;

            if(text.toLowerCase() === ".menu"){
                await sock.sendMessage(from, { text:
`Hello I'm SKY This Beta Mode 🌟

Fitur:
.ping
.generateqr <link>
.reactemoji <link> <emoji>`});
            }

            if(text.toLowerCase() === ".ping"){
                await sock.sendMessage(from, { text: "Pong! 🏓" });
            }

            if(text.toLowerCase().startsWith(".generateqr ")){
                const link = text.split(" ")[1];
                const QRCode = require('qrcode');
                QRCode.toDataURL(link, { errorCorrectionLevel: 'H' }, async (err,url)=>{
                    if(err) return await sock.sendMessage(from, { text:"Gagal generate QR!" });
                    await sock.sendMessage(from, { image:{url}, caption:`QR for: ${link}`});
                });
            }

            if(text.toLowerCase().startsWith(".reactemoji ")){
                await sock.sendMessage(from, { text: `React emoji command diterima: ${text}` });
            }
        }
    });
}

startBot().catch(err=>console.log(err));

// API untuk frontend dashboard cek status
app.get('/status', (req,res)=>{
    res.json({ connected: sock?true:false });
});

app.listen(3000, ()=>console.log("Bot API running on port 3000"));
