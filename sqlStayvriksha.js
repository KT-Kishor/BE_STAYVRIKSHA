const mysql = require('mysql2');

const connection = mysql.createPool({
  host: "193.203.184.197",
  database: "u552898893_stayvriksha",
  user: "u552898893_stayvriksha",
  password: "Admin@SV@1008",
  waitForConnections: true,
  connectionLimit: 1000,
  queueLimit: 5
});

module.exports = connection;