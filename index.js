const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const https = require('https');
const app = express();
const port = 443;

app.use('/assets', express.static('assets'));
app.use(express.json());
app.use(express.urlencoded({
    extended: true,
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
    console.log(`Moi app listening at http://localhost:${port} (https://fabidesing.net/)`);
});