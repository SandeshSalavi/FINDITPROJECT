require("dotenv").config();

const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const engine = require('ejs-mate');
const expressLayouts = require('express-ejs-layouts');
const session = require("express-session");
const { isLoggedIn } = require("./middleware");
const {isAdmin} = require("./middleware");

const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.engine('ejs', engine);  
app.set("view engine", "ejs");
app.set('views', './views');
app.use(expressLayouts);
app.set('layout', './layouts/boilerplate');

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));



const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});


db.connect((err)=>{
    if(err) throw err;
    console.log("Mysql is connected");
});

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
});



app.get("/",isLoggedIn,(req,res)=>{
    // res.send("IT is working");
    res.render("admin/home.ejs");
});

app.get("/browser",isLoggedIn, (req, res) => {
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


app.get("/browse/:item_id",isLoggedIn, (req, res) => {
    const item_id = req.params.item_id;

    const sql = "SELECT * FROM items WHERE item_id = ?";
    db.query(sql, [item_id], (err, rows) => {
        if (err) throw err;
        res.render("user/detail.ejs", { det: rows[0] });
    });
});


app.get("/report",isLoggedIn,(req,res)=>{
res.render("user/report.ejs");
});

app.post("/report",(req,res)=>{
    const { title, description, category, status, date_reported, image_url, location, user_id } = req.body;
   const sql='INSERT INTO items (title, description, category, status, date_reported, image_url, location, user_id) VALUES (?,?,?,?,?,?,?,?)';
    db.query(sql, [title, description, category, status, date_reported, image_url, location, user_id],(err,results)=>{
        if(err) throw err;
        console.log("items added");
        res.redirect("/browser");

    });


});

app.get("/reportfnd",isLoggedIn,(req,res)=>{
res.render("user/reportfount.ejs");
});

app.post("/reportfnd", isLoggedIn, (req, res) => {
    const { title, description, category, status, date_reported, image_url, location, found_id } = req.body;

    // 1️⃣ Insert into itemsfound table
    const insertSql = `INSERT INTO itemsfound 
        (title, description, category, status, date_reported, image_url, location, found_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(insertSql, [title, description, category, status, date_reported, image_url, location, found_id], (err, result) => {
        if (err) throw err;

        console.log("Item inserted into itemsfound");

    
        const updateSql = "UPDATE items SET status = 'found' WHERE item_id = ?";
        db.query(updateSql, [found_id], (err2, result2) => {
            if (err2) throw err2;

            console.log(`Item with ID ${found_id} marked as found in items table`);

           
            res.redirect("/browser");
        });
    });
});

app.get("/login",(req,res)=>{
    res.render("user/login.ejs");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const sql = `SELECT * FROM users WHERE email = ? AND password = ?`;

    db.query(sql, [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
             req.session.user = results[0];
            console.log("Login successful!");
            res.redirect("/");
        } else {
            console.log("Invalid email or password");
            res.send("Invalid login details");
        }
    });
});


app.get("/signup",(req,res)=>{
    res.render("user/signup.ejs");

});

app.post("/signup", (req, res) => {
    const { name, email, phone, password } = req.body;

    const sql = `INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`;

    db.query(sql, [name, email, phone, password], (err, result) => {
        if (err) throw err;

        console.log("User registered successfully!");
        res.redirect("/");
    });
});

app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.send("Logout error");
        res.clearCookie("connect.sid"); 
        res.redirect("/login");
    });
});


app.get("/profile/:user_id",isLoggedIn,  (req, res) => {
    const user_id = req.params.user_id;

    // Get user info
    const sqlUser = "SELECT * FROM users WHERE user_id = ?";

    // Get items reported by user (both lost and found)
    const sqlItems = "SELECT * FROM items WHERE user_id = ?";
    const sqlItemsFound = "SELECT * FROM itemsfound WHERE found_id = ?";

    db.query(sqlUser, [user_id], (err, userRows) => {
        if (err) throw err;

        if (userRows.length === 0) return res.send("User not found");

        // Fetch items from both tables
        db.query(sqlItems, [user_id], (err, itemRows) => {
            if (err) throw err;

            db.query(sqlItemsFound, [user_id], (err, foundRows) => {
                if (err) throw err;

                // Combine both arrays
                const allReports = [...itemRows, ...foundRows];

                res.render("user/profile.ejs", {
                    det: userRows[0],   // user info
                    data: allReports    // all reports
                });
            });
        });
    });
});


app.get("/login/admin",(req,res)=>{
 res.render("admin/loginadmin.ejs");
});



app.post("/login/admin", (req, res) => {
    const { email, password } = req.body;

    const sql = `SELECT * FROM admins WHERE email = ? AND password = ?`;

    db.query(sql, [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
             req.session.user = results[0];
            console.log("Login successful!");
            res.redirect("/admin/dashboard");
        } else {
            console.log("Invalid email or password");
            res.send("Invalid login details");
        }
    });
});

app.get("/logout/admin", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.send("Logout error");
        res.clearCookie("connect.sid"); 
        res.redirect("/login/admin");
    });
});


app.get("/admin/dashboard", (req, res) => {

    const sql1 = "SELECT * FROM itemsfound";
    const sql2 = "SELECT COUNT(*) AS total_pending_reports FROM claims WHERE claim_status = 'pending'";
    const sql3 = "SELECT COUNT(*) AS total_items FROM itemsfound";
    const sql4 = "SELECT COUNT(*) AS total_users FROM users";

    db.query(sql1, (err, itemRows) => {
        if (err) throw err;

        db.query(sql2, (err, pendingRows) => {
            if (err) throw err;

            db.query(sql3, (err, totalItemsRows) => {
                if (err) throw err;

                db.query(sql4, (err, totalUsersRows) => {
                    if (err) throw err;

                    const totalPending = pendingRows[0].total_pending_reports;
                    const totalItems = totalItemsRows[0].total_items;
                    const totalUsers = totalUsersRows[0].total_users;

                    res.render("admin/Admindashboard.ejs", {
                        det: itemRows,
                        pending: totalPending,
                        totalItems: totalItems,
                        totalUsers: totalUsers
                    });
                });
            });
        });
    });

});










app.listen(process.env.PORT,()=>{
    console.log("port is listening on 8060");
}); 