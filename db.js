require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT
});

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL Connection Failed", err);
    } else {
        console.log("✔ MySQL Connected Successfully");
    }
});

module.exports = db;
