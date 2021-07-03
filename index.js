const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const https = require('https');
const app = express();
const port = 443;

const ItemIDToURLMap = new Map();

ItemIDToURLMap.set('3D_MODELS_MAIN', './downloads/3D MODELS MAIN.zip');
ItemIDToURLMap.set('IDENT_TEMPLATES', './downloads/IDENT TEMPLATES.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:*', './downloads/LOWERTHIRDS MAIN.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:DISCORD', './downloads/LOWERTHIRDS MAIN/DISCORD LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:INSTAGRAM', './downloads/LOWERTHIRDS MAIN/INSTAGRAM LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:LIKE', './downloads/LOWERTHIRDS MAIN/LIKE THE VIDEO LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:GENERIC', './downloads/LOWERTHIRDS MAIN/LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:PATREON', './downloads/LOWERTHIRDS MAIN/PATREON LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:REDDIT', './downloads/LOWERTHIRDS MAIN/REDDIT LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:SPOTIFY', './downloads/LOWERTHIRDS MAIN/SPOTIFY LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:TIKTOK', './downloads/LOWERTHIRDS MAIN/TIKTOK LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:TWITCH', './downloads/LOWERTHIRDS MAIN/TWITCH LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:TWITTER', './downloads/LOWERTHIRDS MAIN/TWITTER LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS_MAIN:YOUTUBE', './downloads/LOWERTHIRDS MAIN/YOUTUBE LOWERTHIRD.zip');
ItemIDToURLMap.set('PSALM_PF', './downloads/PSALM PF.zip');
ItemIDToURLMap.set('SEBY_COMMISSION', './downloads/SEBY COMMISSION.zip');
ItemIDToURLMap.set('TRIM_PATH', './downloads/TRIM PATH.zip');
ItemIDToURLMap.set('XEN_COMMISSION', './downloads/XEN COMMISSION.zip');

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({
    extended: true,
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/api/v1/download', (req, res) => {
    const { i: itemId, o: orderId } = req.query;

    if (!itemId || !orderId) {
        res.sendStatus(400);

        return;
    }

    // todo: verify paypal orderId

    const url = ItemIDToURLMap.get(decodeURIComponent(itemId));

    if (url != null) {
        console.log(`Serving "${orderId}": "${itemId}" ("${url}")`);
        res.download(url);
    } else {
        res.sendStatus(404);
    }
});

app.post('/api/v1/email/contact', async (req, res) => {
    console.log(req.body);
    var message = `
<strong>Name: </strong>${req.body.name}<br>
<strong>Email: </strong>${req.body.email}<br>
<strong>Message: </strong>${req.body.message}<br>
<strong>Budget: </strong>${req.body.info}<br>
<strong>Currency: </strong>${req.body.currency}<br>`

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            auth: {
                user: 'keyan.contact.1211@gmail.com',
                pass: 'IamKARTHI12!'
            }
        });
        await transporter.sendMail({
            from: 'keyan.contact.1211@gmail.com',
            to: 'business@fabidesign.net',
            subject: 'Contact - Response',
            html: message
        });
        return res.send({ "status": "Success" });
    } catch (error) {
        console.error(error.message);
        return res.send({ "status": "Failed" });
    }
});

var options = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
};

https.createServer(options, app).listen(port, () => {
    console.log(`Listening at http://localhost:${port} (https://fabidesign.net/)`);
});