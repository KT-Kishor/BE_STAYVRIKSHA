const mysql = require('mysql2');

const connection = mysql.createPool({
  host: "193.203.184.197",
  database: "u552898893_kalpavrikshate",
  user: "u552898893_kalpa_user",
  password: "Kalpavrikshate@123",
  waitForConnections: true,
  connectionLimit: 1000,
  queueLimit: 5
});

module.exports = connection;