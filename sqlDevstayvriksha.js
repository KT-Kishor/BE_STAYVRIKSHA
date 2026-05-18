const mysql = require('mysql2');

const connection = mysql.createPool({
  host: "193.203.184.197",
  database: "u552898893_devstayvriksha",
  user: "u552898893_devstayvriksha",
  password: "Dev@SV@1008",
  waitForConnections: true,
  connectionLimit: 1000,
  queueLimit: 5
});

module.exports = connection;