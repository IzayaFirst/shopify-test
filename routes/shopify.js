const dotenv = require('dotenv').config();
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const nonce = require('nonce')();
const crypto = require('crypto');
const cookie = require('cookie');
var express = require('express');
var router = express.Router();
const scopes = 'write_shipping,write_fulfillments';
const forwardingAddress = "https://bf0e433c.ngrok.io"; 
const querystring = require('querystring');
const request = require('request-promise');
const axios = require('axios')
const register = require('../model/registerShop')

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

router.post('/calculate', (req, res) => {
  console.log('------ calculate -------')
  console.log(req.body)
  const {
    rate: {
      items
    }
  } = req.body
  console.log(items)
  return res.status(200).json({
    rates: [
      { 
      service_name: "Sendo mastering in sending parcel",
      service_code: "Sendo0012345",
      total_price: "10",
      description: "This is a cheapest.",
      currency: "THB"
      },
      { 
        service_name: "Sendo Special",
        service_code: "Sendo00123456",
        total_price: "100",
        description: "This is a special.",
        currency: "THB"
      }
    ]
  })
})

router.post('/payment/hook', async (req, res) => {
  const {
    id,
    email,
    created_at,
    token,
    gateway,
    order_status_url,
    checkout_id,
    line_items,
    shipping_address,
    shipping_lines,
    customer,
    processing_method,
    financial_status,
  } = req.body
  const shop_domain = req.headers['x-shopify-shop-domain'] || ''
  const shop_order_id = req.headers['x-shopify-order-id'] || 0
  console.log( 'line_items', line_items)
  console.log( 'shipping_address', shipping_address)
  console.log( 'customer', customer)
  console.log( 'financial_status', financial_status)
  console.log( 'processing_method', processing_method)
  console.log('shop_domain', shop_domain)
  try {
    const shop = await register.findShop(shop_domain)
    console.log('find shop', shop)
    if(financial_status && processing_method != 'manual' && shop.length > 0) {
      const shopDetail = shop[0] || null
      const {
        company_id
      } = shopDetail
      if (company_id && company_id > 0) {
        // create order now !!
      }
    }
  } catch (err) {
    console.log(err)
  }
  res.status(200).send('ok')
})

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
    console.log('data', shop, hmac, code, state)

    request.post(accessTokenRequestUrl, { json: accessTokenPayload })
    .then(async (accessTokenResponse) => {
      const accessToken = accessTokenResponse.access_token;
      const baseURL = 'https://' + shop;
      const shopRequestHeaders = {
        'X-Shopify-Access-Token': accessToken,
      };
      const carrierPayload = {
        carrier_service: {
          name: "After 5 Logistic",
          callback_url: forwardingAddress + "/shopify/calculate",
          service_discovery: true
        }
      }
      try {
        const findShopName = await register.findShop(shop)
        if (findShopName && findShopName.length == 0) {
          const createShop = await register.register(shop)
        }
        const addShipping = await axios.request({
          baseURL,
          url: '/admin/carrier_services.json',
          method: 'post',
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
          data: carrierPayload,
        })
      } catch(err) {
        console.log('err', err)
      }
      return res.redirect('https://app-staging.after5.co');
    })
    .catch((error) => {
      res.status(error.statusCode).send(error.error.error_description);
    });

  } else {
    res.status(400).send('Required parameters missing');
  }
});




module.exports = router;