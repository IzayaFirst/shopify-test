const dotenv = require('dotenv').config();
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const nonce = require('nonce')();
const crypto = require('crypto');
const cookie = require('cookie');
var express = require('express');
var router = express.Router();
const scopes = 'read_products';
const forwardingAddress = "https://5fa34774.ngrok.io"; 
const querystring = require('querystring');
const request = require('request-promise');

/* GET install callback api. */
router.get('/', function(req, res, next) {
  const {
    shop
  } = req.query
  if(shop) {
    const state = nonce();
    const redirectUri = forwardingAddress + '/shopify/callback';
    const installUrl = 'https://' + shop +
    '/admin/oauth/authorize?client_id=' + apiKey +
    '&scope=' + scopes +
    '&state=' + state +
    '&redirect_uri=' + redirectUri;
    res.cookie('state', state);
    res.redirect(installUrl);

  } else {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
  }
});


router.get('/callback', (req, res) => {
  const { shop, hmac, code, state } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;
  console.log(shop, hmac, code, state)
  if (state !== stateCookie) {
    return res.status(403).send('Request origin cannot be verified');
  }

  if (shop && hmac && code) {
    // Your app needs to validate the request by using HMAC validation to make sure that the request has come from Shopify.

    const map = Object.assign({}, req.query);
    delete map['signature'];
    delete map['hmac'];
    const message = querystring.stringify(map);
    const providedHmac = Buffer.from(hmac, 'utf-8');
    const generatedHash = Buffer.from(
      crypto
        .createHmac('sha256', apiSecret)
        .update(message)
        .digest('hex'),
        'utf-8'
      );
    let hashEquals = false;

    try {
      hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
    } catch (e) {
      hashEquals = false;
    };

    if (!hashEquals) {
      return res.status(400).send('HMAC validation failed');
    }

    // DONE: Exchange temporary code for a permanent access token
    const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
    const accessTokenPayload = {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    }; 

    request.post(accessTokenRequestUrl, { json: accessTokenPayload })
    .then((accessTokenResponse) => {
      const accessToken = accessTokenResponse.access_token;
      console.log('accessToken', accessToken)
      res.status(200).send("Got an access token, let's do something with it");
    })
    .catch((error) => {
      res.status(error.statusCode).send(error.error.error_description);
    });

  } else {
    res.status(400).send('Required parameters missing');
  }
});

module.exports = router;