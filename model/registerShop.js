const pool = require('./mysqlConnector');

const findShop = (shop_name) => {
  return new Promise((resolve,reject) => {
    pool.query("select * from after_5.shopify where shop_name = ?", [shop_name], async function (error, results, fields) {
      if (error)  {
        console.log(error)
        reject(err)
      }
      if (results) {
        resolve(results)
      } else {
        resolve([])
      }
    })
  })
}


function register(shop_name) {
  return new Promise((resolve,reject) => {
    pool.query("insert into after_5.shopify (shop_name) values (?)", [shop_name], function (error, results, fields) {
      if (error)  {
        console.log(error)
        reject()
      }
      if (results) {
        resolve(results)
      } else {
        resolve([])
      }
    })
  })
}

module.exports = {
  findShop,
  register,
}

