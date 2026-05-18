const mysql = require('mysql2');

const connection = mysql.createPool({
  host: "193.203.184.149",
  database: "u119584791_MiniHRSolution",
  user: "u119584791_KTVeerang",
  password: "KT@minidb@1008",
  waitForConnections: true,
  connectionLimit: 1000,
  queueLimit: 5
});

module.exports = connection;