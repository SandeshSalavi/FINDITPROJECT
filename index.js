require("dotenv").config();

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const engine = require("ejs-mate");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const db = require("./db");
const { isLoggedIn, isAdmin } = require("./middleware");

const app = express();

// ================= MIDDLEWARES =================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", "./views");

app.use(expressLayouts);
app.set("layout", "./layouts/boilerplate");

// Express-session
app.use(
    session({
        secret: process.env.SESSION_SECRET || "default_secret",
        resave: false,
        saveUninitialized: false
    })
);

// Global user access
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
});

// ================= ROUTES =================

// Home
app.get("/", isLoggedIn, (req, res) => {
    res.render("admin/home");
});

// Browser (Lost / Found Filter)
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
        res.render("user/Browser", { data: rows });
    });
});

// Detail page
app.get("/browse/:id", isLoggedIn, (req, res) => {
    db.query("SELECT * FROM items WHERE item_id = ?", [req.params.id], (err, rows) => {
        res.render("user/detail", { det: rows[0] });
    });
});

// Report Lost
app.get("/report", isLoggedIn, (req, res) => {
    res.render("user/report");
});

app.post("/report", isLoggedIn, (req, res) => {
    const { title, description, category, status, date_reported, image_url, location } = req.body;

    const sql = `
        INSERT INTO items 
        (title, description, category, status, date_reported, image_url, location, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [title, description, category, status, date_reported, image_url, location, req.session.user.user_id], () => {
        res.redirect("/browser");
    });
});

// Report Found
app.get("/reportfnd", isLoggedIn, (req, res) => {
    res.render("user/reportfount");
});

app.post("/reportfnd", isLoggedIn, (req, res) => {
    const { title, description, category, status, date_reported, image_url, location, found_id } = req.body;

    const insert = `
        INSERT INTO itemsfound 
        (title, description, category, status, date_reported, image_url, location, found_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insert, [title, description, category, status, date_reported, image_url, location, found_id], () => {
        db.query("UPDATE items SET status='found' WHERE item_id = ?", [found_id], () => {
            res.redirect("/browser");
        });
    });
});

// Login
app.get("/login", (req, res) => {
    res.render("user/login");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, result) => {
        if (result.length > 0) {
            req.session.user = result[0];
            res.redirect("/");
        } else res.send("Invalid login");
    });
});

// Signup
app.get("/signup", (req, res) => {
    res.render("user/signup");
});

app.post("/signup", (req, res) => {
    const { name, email, phone, password } = req.body;

    db.query("INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
        [name, email, phone, password], () => res.redirect("/login"));
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

// Admin Dashboard
app.get("/admin/dashboard", isAdmin, (req, res) => {
    const sql1 = "SELECT * FROM itemsfound";
    const sql2 = "SELECT COUNT(*) AS pending FROM claims WHERE claim_status='pending'";
    const sql3 = "SELECT COUNT(*) AS total_items FROM itemsfound";
    const sql4 = "SELECT COUNT(*) AS total_users FROM users";

    db.query(sql1, (err, items) => {
        db.query(sql2, (err, pend) => {
            db.query(sql3, (err, itemsCount) => {
                db.query(sql4, (err, userCount) => {
                    res.render("admin/Admindashboard", {
                        det: items,
                        pending: pend[0].pending,
                        totalItems: itemsCount[0].total_items,
                        totalUsers: userCount[0].total_users
                    });
                });
            });
        });
    });
});

// ================= START SERVER =================
app.listen(process.env.PORT || 3000, () => {
    console.log(`✔ Server running on port ${process.env.PORT || 3000}`);
});
