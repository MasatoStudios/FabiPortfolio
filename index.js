const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const https = require('https');
const app = express();
const port = 443;

const ItemIDToURLMap = new Map();

ItemIDToURLMap.set('IDENT_TEMPLATES:*', './downloads/IDENT TEMPLATES/IDENT TEMPLATES.zip');
ItemIDToURLMap.set('IDENT_TEMPLATES:1', './downloads/IDENT TEMPLATES/TEMPLATE 1.zip');
ItemIDToURLMap.set('IDENT_TEMPLATES:2', './downloads/IDENT TEMPLATES/TEMPLATE 2.zip');
ItemIDToURLMap.set('IDENT_TEMPLATES:3', './downloads/IDENT TEMPLATES/TEMPLATE 3.zip');

ItemIDToURLMap.set('3D_MODELS:*', './downloads/3D MODELS/3D MODELS.zip');
ItemIDToURLMap.set('3D_MODELS:IMAC_SETUP', './downloads/3D MODELS/IMAC SETUP + KEYBOARD & TRACKPAD.zip');
ItemIDToURLMap.set('3D_MODELS:MAC_PRO', './downloads/3D MODELS/MAC PRO MODEL.zip');
ItemIDToURLMap.set('3D_MODELS:MACBOOK', './downloads/3D MODELS/MACBOOK MODEL.zip');
ItemIDToURLMap.set('3D_MODELS:IPHONE', './downloads/3D MODELS/IPHONE MODEL.zip');

ItemIDToURLMap.set('LOWERTHIRDS:*', './downloads/LOWERTHIRDS/LOWERTHIRDS.zip');
ItemIDToURLMap.set('LOWERTHIRDS:DISCORD', './downloads/LOWERTHIRDS/DISCORD LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS:INSTAGRAM', './downloads/LOWERTHIRDS/INSTAGRAM LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS:LIKE', './downloads/LOWERTHIRDS/LIKE THE VIDEO LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS:PATREON', './downloads/LOWERTHIRDS/PATREON LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS:REDDIT', './downloads/LOWERTHIRDS/REDDIT LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS:SPOTIFY', './downloads/LOWERTHIRDS/SPOTIFY LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS:TIKTOK', './downloads/LOWERTHIRDS/TIKTOK LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS:TWITCH', './downloads/LOWERTHIRDS/TWITCH LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS:TWITTER', './downloads/LOWERTHIRDS/TWITTER LOWERTHIRD.zip');
ItemIDToURLMap.set('LOWERTHIRDS:YOUTUBE', './downloads/LOWERTHIRDS/YOUTUBE LOWERTHIRD.zip');

ItemIDToURLMap.set('TRIM_PATH:*', './downloads/TRIM PATH/TRIM PATH.zip');
ItemIDToURLMap.set('TRIM_PATH:PROVICALI', './downloads/TRIM PATH/PROVICALI.zip');
ItemIDToURLMap.set('TRIM_PATH:GOTHAM', './downloads/TRIM PATH/GOTHAM.zip');

ItemIDToURLMap.set('PSALM_PF:_', './downloads/PSALM PF.zip');

ItemIDToURLMap.set('SEBY_COMMISSION:_', './downloads/SEBY COMMISSION.zip');

ItemIDToURLMap.set('XEN_COMMISSION:_', './downloads/XEN COMMISSION.zip');

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