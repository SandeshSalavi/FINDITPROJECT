require("dotenv").config();

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const engine = require("ejs-mate");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

// ✅ Import Correct DB File
const db = require("./db");

// Middleware
const { isLoggedIn, isAdmin } = require("./middleware");

const app = express();

/* =====================================
   DEBUG – Check Railway Environment
===================================== */
console.log("ENV CHECK:", {
    MYSQLHOST: process.env.MYSQLHOST,
    MYSQLUSER: process.env.MYSQLUSER,
    MYSQLDATABASE: process.env.MYSQLDATABASE,
    MYSQLPORT: process.env.MYSQLPORT
});

/* =====================================
   EXPRESS MIDDLEWARE
===================================== */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", "./views");

app.use(expressLayouts);
app.set("layout", "./layouts/boilerplate");

/* =====================================
   SESSION
===================================== */

// Create MySQL session store
const sessionStore = new MySQLStore({
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD, // make sure you have MYSQLPASSWORD in .env
    database: process.env.MYSQLDATABASE,
});

app.use(
    session({
        key: "session_cookie_name",
        secret: process.env.SESSION_SECRET || "default_secret_key",
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
    })
);

// Global user object
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || req.session.admin;
    next();
});

/* =====================================
   USER ROUTES
===================================== */

// Home Page (Dashboard)
app.get("/", isLoggedIn, (req, res) => {
    res.render("admin/home.ejs");
});

/* ---------- Browser ---------- */
app.get("/browser", isLoggedIn, (req, res) => {
    const { status } = req.query;

    let sql = "SELECT * FROM items";
    let params = [];

    if (status === "lost" || status === "found") {
        sql += " WHERE status = ?";
        params.push(status);
    }

    db.query(sql, params, (err, rows) => {
        if (err) throw err;
        res.render("user/Browser.ejs", { data: rows });
    });
});

/* ---------- Item Detail ---------- */
app.get("/browse/:item_id", isLoggedIn, (req, res) => {
    db.query(
        "SELECT * FROM items WHERE item_id = ?",
        [req.params.item_id],
        (err, rows) => {
            if (err) throw err;
            res.render("user/detail.ejs", { det: rows[0] });
        }
    );
});

/* ---------- Lost Report ---------- */
app.get("/report", isLoggedIn, (req, res) => {
    res.render("user/report.ejs");
});

app.post("/report", (req, res) => {
    const { title, description, category, status, date_reported, image_url, location, user_id } = req.body;

    const sql = `
        INSERT INTO items (title, description, category, status, date_reported, image_url, location, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [title, description, category, status, date_reported, image_url, location, user_id], err => {
        if (err) throw err;
        res.redirect("/browser");
    });
});

/* ---------- Found Report ---------- */
app.get("/reportfnd", isLoggedIn, (req, res) => {
    res.render("user/reportfount.ejs");
});

app.post("/reportfnd", isLoggedIn, (req, res) => {
    const { title, description, category, status, date_reported, image_url, location, found_id } = req.body;

    const insertSql = `
        INSERT INTO itemsfound (title, description, category, status, date_reported, image_url, location, found_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [title, description, category, status, date_reported, image_url, location, found_id], err => {
        if (err) throw err;

        db.query("UPDATE items SET status='found' WHERE item_id=?", [found_id], () => {
            res.redirect("/browser");
        });
    });
});

/* ---------- Login ---------- */
app.get("/login", (req, res) => {
    res.render("user/login.ejs");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            req.session.user = results[0];
            return res.redirect("/");
        }

        res.send("Invalid login details");
    });
});

/* ---------- Signup ---------- */
app.get("/signup", (req, res) => {
    res.render("user/signup.ejs");
});

app.post("/signup", (req, res) => {
    const { name, email, phone, password } = req.body;

    db.query(
        "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
        [name, email, phone, password],
        err => {
            if (err) throw err;
            res.redirect("/login");
        }
    );
});

/* ---------- Logout ---------- */
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

/* ---------- User Profile ---------- */
app.get("/profile/:user_id", isLoggedIn, (req, res) => {
    const uid = req.params.user_id;

    const sqlUser = "SELECT * FROM users WHERE user_id = ?";
    const sqlLost = "SELECT * FROM items WHERE user_id = ?";
    const sqlFound = "SELECT * FROM itemsfound WHERE found_id = ?";

    db.query(sqlUser, [uid], (err, userRows) => {
        db.query(sqlLost, [uid], (err, lostItems) => {
            db.query(sqlFound, [uid], (err, foundItems) => {
                res.render("user/profile.ejs", {
                    det: userRows[0],
                    data: [...lostItems, ...foundItems]
                });
            });
        });
    });
});

/* =====================================
   ADMIN ROUTES
===================================== */

app.get("/login/admin", (req, res) => {
    res.render("admin/loginadmin.ejs");
});

app.post("/login/admin", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM admins WHERE email = ? AND password = ?", [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            req.session.admin = results[0];
            return res.redirect("/admin/dashboard");
        }

        res.send("Invalid admin details");
    });
});

app.get("/logout/admin", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login/admin");
    });
});

/* ---------- Admin Dashboard ---------- */
app.get("/admin/dashboard", isAdmin, (req, res) => {
    const sql1 = "SELECT * FROM itemsfound";
    const sql2 = "SELECT COUNT(*) AS total_pending_reports FROM claims WHERE claim_status='pending'";
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

/* =====================================
   START SERVER
===================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✔ Server running on port ${PORT}`);
});
