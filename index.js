require("dotenv").config();

const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const engine = require("ejs-mate");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const { isLoggedIn, isAdmin } = require("./middleware");

const app = express();

// Debug to ensure Railway env variables loaded
console.log("ENV CHECK:", {
    MYSQLHOST: process.env.MYSQLHOST,
    MYSQLUSER: process.env.MYSQLUSER,
    MYSQLDATABASE: process.env.MYSQLDATABASE,
    MYSQLPORT: process.env.MYSQLPORT
});

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(expressLayouts);
app.set("layout", "./layouts/boilerplate");

// MySQL connection (Correct for Railway)
const db = mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error("MYSQL CONNECTION FAILED ❌", err);
        return;
    }
    console.log("MYSQL CONNECTED ✔");
});

// Session
app.use(
    session({
        secret: process.env.SESSION_SECRET || "default_secret_key",
        resave: false,
        saveUninitialized: false
    })
);

// Share logged-in user globally
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
});

// ================= ROUTES =================

// Home
app.get("/", isLoggedIn, (req, res) => {
    res.render("admin/home.ejs");
});

// Browser
app.get("/browser", isLoggedIn, (req, res) => {
    const { status } = req.query;
    let sql = "SELECT * FROM items";
    let params = [];

    if (status && (status === "lost" || status === "found")) {
        sql += " WHERE status = ?";
        params.push(status);
    }

    db.query(sql, params, (err, rows) => {
        if (err) throw err;
        res.render("user/Browser.ejs", { data: rows });
    });
});

// Item detail
app.get("/browse/:item_id", isLoggedIn, (req, res) => {
    const item_id = req.params.item_id;
    db.query("SELECT * FROM items WHERE item_id = ?", [item_id], (err, rows) => {
        if (err) throw err;
        res.render("user/detail.ejs", { det: rows[0] });
    });
});

// Report lost
app.get("/report", isLoggedIn, (req, res) => {
    res.render("user/report.ejs");
});

// Insert lost report
app.post("/report", (req, res) => {
    const { title, description, category, status, date_reported, image_url, location, user_id } = req.body;

    const sql =
        "INSERT INTO items (title, description, category, status, date_reported, image_url, location, user_id) VALUES (?,?,?,?,?,?,?,?)";

    db.query(sql, [title, description, category, status, date_reported, image_url, location, user_id], (err) => {
        if (err) throw err;
        res.redirect("/browser");
    });
});

// Found item reporting
app.get("/reportfnd", isLoggedIn, (req, res) => {
    res.render("user/reportfount.ejs");
});

app.post("/reportfnd", isLoggedIn, (req, res) => {
    const { title, description, category, status, date_reported, image_url, location, found_id } = req.body;

    const insertSql = `
        INSERT INTO itemsfound 
        (title, description, category, status, date_reported, image_url, location, found_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(insertSql, [title, description, category, status, date_reported, image_url, location, found_id], (err) => {
        if (err) throw err;

        const updateSql = "UPDATE items SET status = 'found' WHERE item_id = ?";
        db.query(updateSql, [found_id], (err2) => {
            if (err2) throw err2;
            res.redirect("/browser");
        });
    });
});

// Login
app.get("/login", (req, res) => {
    res.render("user/login.ejs");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect("/");
        } else {
            res.send("Invalid login details");
        }
    });
});

// Signup
app.get("/signup", (req, res) => {
    res.render("user/signup.ejs");
});

app.post("/signup", (req, res) => {
    const { name, email, phone, password } = req.body;

    db.query(
        "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
        [name, email, phone, password],
        (err) => {
            if (err) throw err;
            res.redirect("/");
        }
    );
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

// User profile
app.get("/profile/:user_id", isLoggedIn, (req, res) => {
    const user_id = req.params.user_id;

    const sqlUser = "SELECT * FROM users WHERE user_id = ?";
    const sqlItems = "SELECT * FROM items WHERE user_id = ?";
    const sqlItemsFound = "SELECT * FROM itemsfound WHERE found_id = ?";

    db.query(sqlUser, [user_id], (err, userRows) => {
        if (err) throw err;

        db.query(sqlItems, [user_id], (err, items) => {
            db.query(sqlItemsFound, [user_id], (err, foundItems) => {
                const allReports = [...items, ...foundItems];
                res.render("user/profile.ejs", { det: userRows[0], data: allReports });
            });
        });
    });
});

// Admin Login
app.get("/login/admin", (req, res) => {
    res.render("admin/loginadmin.ejs");
});

app.post("/login/admin", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM admins WHERE email = ? AND password = ?", [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect("/admin/dashboard");
        } else {
            res.send("Invalid login details");
        }
    });
});

// Admin Logout
app.get("/logout/admin", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login/admin");
    });
});

// Admin Dashboard
app.get("/admin/dashboard", (req, res) => {
    const sql1 = "SELECT * FROM itemsfound";
    const sql2 = "SELECT COUNT(*) AS total_pending_reports FROM claims WHERE claim_status = 'pending'";
    const sql3 = "SELECT COUNT(*) AS total_items FROM itemsfound";
    const sql4 = "SELECT COUNT(*) AS total_users FROM users";

    db.query(sql1, (err, itemsFound) => {
        db.query(sql2, (err, pending) => {
            db.query(sql3, (err, totalItems) => {
                db.query(sql4, (err, totalUsers) => {
                    res.render("admin/Admindashboard.ejs", {
                        det: itemsFound,
                        pending: pending[0].total_pending_reports,
                        totalItems: totalItems[0].total_items,
                        totalUsers: totalUsers[0].total_users
                    });
                });
            });
        });
    });
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✔ Server running on port ${PORT}`);
});
