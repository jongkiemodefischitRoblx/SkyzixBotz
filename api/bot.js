const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, DisconnectReason } = require("@whiskeysockets/baileys");
const Pino = require('pino');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let qrData = null;
let connected = false;
let userId = null;
let pairedDevices = [];

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS("Safari"),
        logger: Pino({ level: 'fatal' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;

        if(qr){
            qrData = await QRCode.toDataURL(qr);
        }

        if(connection === "open"){
            connected = true;
            userId = sock.user.id.split(':')[0];
            if(!pairedDevices.includes(userId)){
                pairedDevices.push(userId);
            }
        }

        if(connection === "close"){
            connected = false;
            userId = null;
            await delay(5000);
            startBot().catch(console.log);
        }
    });

    // WA message listener
    sock.ev.on('messages.upsert', async (msgUpdate)=>{
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
                const qrImg = await QRCode.toDataURL(link);
                await sock.sendMessage(from, { image:{url: qrImg}, caption:`QR for: ${link}`});
            }

            if(text.toLowerCase().startsWith(".reactemoji ")){
                await sock.sendMessage(from, { text: `React emoji command diterima: ${text}` });
            }
        }
    });
}

startBot().catch(console.log);

// API status
app.get('/status', (req,res)=>{
    res.json({
        connected,
        qr: qrData,
        devices: pairedDevices
    });
});

// API generate fixed Pairing Code
app.get('/pairing', async (req,res)=>{
    if(!connected) return res.json({error:"Bot belum connected"});
    const code = "SKYZIXBT"; // fixed Pairing Code
    res.json({ code });
});

app.listen(3000, ()=>console.log("Bot API running on port 3000"));
