/* eslint-disable camelcase */
const JSONdb = require('simple-json-db');
const dotenv = require('dotenv');
const btoa = require('btoa');
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const http = require('http');
const https = require('https');
const fetch = require('node-fetch');
const morgan = require('morgan');
const app = express();

const PAYPAL_OAUTH_API = 'https://api-m.paypal.com/v1/oauth2/token/';
const PAYPAL_ORDER_API = 'https://api-m.paypal.com/v2/checkout/orders/';

/** @typedef {{id: string, quantity: number}} ItemRequest */

dotenv.config();

const productsDb = new JSONdb('./db/products.v1.json', { asyncWrite: true });
const ordersDb = new JSONdb('./db/orders.v1.json', { asyncWrite: true });
const paymentIdToTransactionsMap = new Map();
const paymentIdToItemIdsMap = new Map();
let auth;
let authRequestTime = 0;

app.use(express.static('public'));
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.urlencoded({
	extended: true,
}));

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/api/v1/payment/new', async (req, res) => {
	/** @type {ItemRequest[]} */
	const json = req.body;

	if (json === null
		|| typeof json !== 'object'
		|| !Array.isArray(json.items)
		|| json.items.length < 1) {
		res.status(400).send('""');

		return;
	}

	let total;

	try {
		total = json.items.reduce((prev, curr) => prev + (productsDb.get(curr.id).price * curr.quantity), 0);

		if (!total) {
			throw new Error();
		}
	} catch (_) {
		// curr.id is undefined
		// 		or
		// db produced an error
		// 		or
		// total is falsish

		res.status(400).send('""');

		return;
	}

	const purchase_units = [{
		reference_id: `${Date.now()}:${Math.floor(Math.random() * 1000)}`,
		amount: {
			value: total,
			currency_code: 'USD',
			description: 'Purchase from Fabi',
		},
	}];

	try {
		const response = await fetch(PAYPAL_ORDER_API, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${await getAccessToken()}`,
			},
			body: JSON.stringify({
				intent: 'CAPTURE',
				purchase_units,
			}),
		});
		const result = await response.json();

		if (result.message) {
			console.error(result);
			throw new Error();
		}

		if (!response.ok
			|| !result.id) {
			console.error(response.status);
			throw new Error('New payment creation result not OK');
		}

		paymentIdToTransactionsMap.set(result.id, purchase_units);
		paymentIdToItemIdsMap.set(result.id, json.items);
		// force delete order after 30 minutes of non-completion
		setTimeout(() => {
			paymentIdToTransactionsMap.delete(result.id);
			paymentIdToItemIdsMap.delete(result.id);
		}, 30 * 60 * 1000);

		res.json({
			payment: result.id,
		});

		console.log(`Created new payment("${result.id}")`);
	} catch (err) {
		console.error(err);

		res.status(500).send('""');
	}
});

app.post('/api/v1/payment/execute', async (req, res) => {
	const json = req.body;

	if (json === null
		|| typeof json !== 'object'
		|| typeof json.payment !== 'string') {
		res.status(400).send('""');

		return;
	}

	const purchase_units = paymentIdToTransactionsMap.get(json.payment);
	const itemIds = paymentIdToItemIdsMap.get(json.payment);

	if (purchase_units == null
		|| itemIds == null) {
		res.status(400).send('""');

		return;
	}

	try {
		const response = await fetch(`${PAYPAL_ORDER_API}${json.payment}/capture`, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${await getAccessToken()}`,
			},
			/* eslint-disable camelcase */
			body: JSON.stringify({
				purchase_units,
			}),
			/* eslint-enable camelcase */
		});
		const result = await response.json();

		if (result.message) {
			console.error(result);
			throw new Error();
		}

		if (!response.ok
			|| !result.id) {
			console.error(response.status);
			throw new Error(`Payment("${json.payment}") execution result not OK`);
		}

		const capture = result.purchase_units[0].payments.captures[0].id;

		ordersDb.set(capture, itemIds);
		paymentIdToTransactionsMap.delete(json.payment);
		paymentIdToItemIdsMap.delete(json.payment);

		res.json({
			capture,
		});

		console.log(`Executed payment("${json.payment}")`);
	} catch (err) {
		console.error(err);

		res.status(500).send('""');
	}
});

app.get('/api/v1/download', (req, res) => {
	const { item, payment } = req.query;

	if (!item
		|| !payment) {
		res.status(400).send('""');

		return;
	}

	/** @type {ItemRequest[]} */
	const orderedItems = ordersDb.get(decodeURIComponent(payment));

	if (orderedItems == null
		|| !Array.isArray(orderedItems)
		|| !orderedItems.some(({ id }) => id === decodeURIComponent(item))) {
		res.status(403).send('""');

		return;
	}

	const uri = path.resolve('./raw/downloads', productsDb.get(decodeURIComponent(item)).uri);

	if (uri == null) {
		res.status(404).send('""');
		return;
	}

	console.log(`Serving "${payment}": "${item}" ("${uri}")`);
	res.download(uri);
});

app.post('/api/v1/email/contact', async (req, res) => {
	const message = `<strong>Name: </strong>${req.body.name}<br>
<strong>Email: </strong>${req.body.email}<br>
<strong>Message: </strong>${req.body.message}<br>
<strong>Budget: </strong>${req.body.info}<br>
<strong>Currency: </strong>${req.body.currency}<br>`;

	try {
		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			auth: {
				user: process.env.GMAIL_USER,
				pass: process.env.GMAIL_PASS,
			},
		});
		await transporter.sendMail({
			from: process.env.GMAIL_USER,
			to: 'business@fabidesign.net',
			subject: 'Contact - Response',
			html: message,
		});
		return res.sendStatus(200);
	} catch (err) {
		console.error(err);

		return res.sendStatus(500);
	}
});

async function getAccessToken() {
	if (isAuthExpired()) {
		console.warn('Refreshing access token on access. This is a failsafe & should not be happening');
		await refreshAuth();
	}

	return auth.access_token;
}

function isAuthExpired() {
	if (auth != null
		// if is not expired or less than 30 secs away from expiring
		&& ((auth.expires_in ?? 0) * 1000) + authRequestTime > Date.now() - 3000) {
		return false;
	}

	return true;
}

async function refreshAuth() {
	auth = await (
		await fetch(PAYPAL_OAUTH_API, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${btoa(`${process.env.PAYPAL_CLIENT}:${process.env.PAYPAL_SECRET}`)}`,
			},
			body: 'grant_type=client_credentials',
		})
	).json();
	authRequestTime = Date.now();
}

async function scheduleAuthRefresh() {
	if (isAuthExpired()) {
		await refreshAuth();
	}

	setInterval(refreshAuth, (auth.expires_in - 30) * 1000);
}

(async () => {
	scheduleAuthRefresh();

	http
		.createServer((req, res) => {
			res.writeHead(308, {
				Location: `https://${req.headers.host}${req.url}`,
			});
			res.end();
		})
		.listen(80, () => {
			console.log('HTTPS forwarder server listening on port 80');
		});

	https
		.createServer({
			key: fs.readFileSync('./key.pem'),
			cert: fs.readFileSync('./cert.pem'),
		}, app)
		.listen(443, () => {
			console.log('Main server listening on port 443');
		});
})();
