const dotenv = require('dotenv').config();
const mysql = require('mysql')

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DATABASE_HOST || "",
  port: process.env.DATABASE_PORT || "",
  user: process.env.DATABASE_USERNAME || "",
  password: process.env.DATABASE_PASSWORD || "",
  database: process.env.DATABASE_NAME || ""
});

pool.getConnection(function(err, connection) {
  if (err) throw err; // not connected!
});

pool.on('connection', function (connection) {
  console.log("MYSQL: Connected");
});

module.exports = pool