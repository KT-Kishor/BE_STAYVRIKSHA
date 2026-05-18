const mysql = require('mysql2');

const connection = mysql.createPool({
  host: "193.203.184.149",
  database: "u119584791_CustomerDetail",
  user: "u119584791_Customer",
  password: "KT@Cust123",
  waitForConnections: true,
  connectionLimit: 1000,
  queueLimit: 5
});

module.exports = connection;