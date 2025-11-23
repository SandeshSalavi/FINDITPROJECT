// dbSetup.js
const db = require("./db");  // uses db.query
require("dotenv").config();

async function setupDatabase() {
    try {
        console.log("🚀 Starting Database Setup...");

        // -------------------------
        // USERS TABLE
        // -------------------------
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                phone VARCHAR(15),
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✔️ users table created");

        // -------------------------
        // ITEMS TABLE
        // -------------------------
        await db.query(`
            CREATE TABLE IF NOT EXISTS items (
                item_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                status ENUM('lost', 'found') NOT NULL,
                date_reported DATE NOT NULL,
                image_url VARCHAR(255),
                location VARCHAR(200),
                user_id INT,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );
        `);
        console.log("✔️ items table created");

        // -------------------------
        // ITEMSFOUND TABLE
        // -------------------------
        await db.query(`
            CREATE TABLE IF NOT EXISTS itemsfound (
                item_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                status ENUM('found') NOT NULL,
                date_reported DATE NOT NULL,
                image_url VARCHAR(255),
                location VARCHAR(200),
                found_id INT
            );
        `);
        console.log("✔️ itemsfound table created");

        // -------------------------
        // CLAIMS TABLE
        // -------------------------
        await db.query(`
            CREATE TABLE IF NOT EXISTS claims (
                claim_id INT AUTO_INCREMENT PRIMARY KEY,
                item_id INT NOT NULL,
                claimant_id INT NOT NULL,
                claim_message TEXT,
                claim_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(item_id) REFERENCES items(item_id),
                FOREIGN KEY(claimant_id) REFERENCES users(user_id)
            );
        `);
        console.log("✔️ claims table created");

        // -------------------------
        // MESSAGES TABLE
        // -------------------------
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                message_id INT AUTO_INCREMENT PRIMARY KEY,
                claim_id INT NOT NULL,
                sender_id INT NOT NULL,
                message TEXT NOT NULL,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (claim_id) REFERENCES claims(claim_id),
                FOREIGN KEY (sender_id) REFERENCES users(user_id)
            );
        `);
        console.log("✔️ messages table created");

        // -------------------------
        // INSERT USERS DATA
        // -------------------------
        await db.query(`
            INSERT INTO users (name, email, phone, password) VALUES
            ('Rahul Sharma', 'rahul.sharma@example.com', '9876543210', 'rahul123'),
            ('Priya Verma', 'priya.verma@example.com', '8765432109', 'priya@2024'),
            ('Amit Kumar', 'amit.kumar@example.com', '9123456780', 'amitPass'),
            ('Sneha Singh', 'sneha.singh@example.com', '9988776655', 'snehaSecure'),
            ('Rohit Patel', 'rohit.patel@example.com', '9090909090', 'rohit@lost');
        `);
        console.log("✔️ sample users inserted");

        // -------------------------
        // INSERT ITEMS DATA
        // -------------------------
        await db.query(`
            INSERT INTO items (title, description, category, status, date_reported, image_url, location, user_id) VALUES
            ('Black Wallet', 'Leather wallet with some cash and ID cards', 'Accessories', 'lost', '2025-10-01', '/uploads/bag.jpeg', 'Mumbai Central Station', 1),
            ('iPhone 14', 'White iPhone with transparent case', 'Electronics', 'lost', '2025-09-20', '/uploads/bag.jpeg', 'Pune Bus Stand', 2),
            ('Golden Bracelet', 'Small gold bracelet found near park bench', 'Jewellery', 'found', '2025-10-10', '/uploads/bag.jpeg', 'Hyderabad City Park', 3),
            ('Backpack', 'Blue backpack containing books and laptop', 'Bags', 'lost', '2025-10-15', '/uploads/bag.jpeg', 'Delhi Metro Station', 4),
            ('Wrist Watch', 'Silver Titan wrist watch found in cafeteria', 'Accessories', 'found', '2025-10-05', '/uploads/bag.jpeg', 'Bangalore Cafe', 5);
        `);
        console.log("✔️ sample items inserted");

        // -------------------------
        // INSERT ITEMSFOUND DATA
        // -------------------------
        await db.query(`
            INSERT INTO itemsfound 
            (title, description, category, status, date_reported, image_url, location, found_id)
            VALUES
            ('Wallet', 'Black leather wallet with cards inside', 'Accessories', 'found', '2025-01-10', 'wallet.jpg', 'Mumbai', 101),
            ('Mobile Phone', 'Samsung Galaxy A51 with cracked screen', 'Electronics', 'found', '2025-01-12', 'mobile.jpg', 'Pune', 102),
            ('Backpack', 'Blue backpack containing books', 'Bags', 'found', '2025-02-05', 'bag.jpg', 'Nagpur', 103),
            ('Gold Ring', 'Small gold ring found near park bench', 'Jewellery', 'found', '2025-02-20', 'ring.jpg', 'Nashik', 104),
            ('ID Card', 'College ID card found near bus stop', 'Documents', 'found', '2025-03-01', 'idcard.jpg', 'Thane', 105);
        `);
        console.log("✔️ sample itemsfound inserted");

        // -------------------------
        // INSERT CLAIMS DATA
        // -------------------------
        await db.query(`
            INSERT INTO claims (item_id, claimant_id, claim_message, claim_status) VALUES
            (3, 1, 'This bracelet looks like the one I lost last week.', 'pending'),
            (5, 2, 'I think this watch belongs to me, can you please verify?', 'pending'),
            (1, 4, 'I found a similar wallet nearby, could it be mine?', 'approved'),
            (2, 5, 'That iPhone seems to be mine. Can I confirm via IMEI?', 'pending'),
            (4, 3, 'This backpack matches the one I saw near the metro.', 'rejected');
        `);
        console.log("✔️ sample claims inserted");

        // -------------------------
        // INSERT MESSAGES DATA
        // -------------------------
        await db.query(`
            INSERT INTO messages (claim_id, sender_id, message) VALUES
            (1, 1, 'Hello, I lost a bracelet like this. Can I describe it?'),
            (1, 3, 'Sure, please tell me the design details.'),
            (2, 2, 'Can you check if the back of the watch has “PV” engraved?'),
            (2, 5, 'Yes, it does! It must be yours.'),
            (4, 5, 'I can share the IMEI number if needed to confirm ownership.');
        `);
        console.log("✔️ sample messages inserted");

        console.log("\n🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!");
        process.exit();

    } catch (err) {
        console.error("❌ ERROR:", err);
        process.exit(1);
    }
}
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
    if (err) return console.log("❌ Setup Failed", err);
    console.log("✔ Connected for Setup");

    const usersTable = `
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100),
            phone VARCHAR(20),
            password VARCHAR(100)
        );
    `;

    const adminTable = `
        CREATE TABLE IF NOT EXISTS admins (
            admin_id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(100),
            password VARCHAR(100)
        );
    `;

    const itemsTable = `
        CREATE TABLE IF NOT EXISTS items (
            item_id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200),
            description TEXT,
            category VARCHAR(100),
            status VARCHAR(20),
            date_reported DATE,
            image_url VARCHAR(255),
            location VARCHAR(255),
            user_id INT
        );
    `;

    const itemsFoundTable = `
        CREATE TABLE IF NOT EXISTS itemsfound (
            found_id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200),
            description TEXT,
            category VARCHAR(100),
            status VARCHAR(20),
            date_reported DATE,
            image_url VARCHAR(255),
            location VARCHAR(255),
            found_by INT
        );
    `;

    const claimsTable = `
        CREATE TABLE IF NOT EXISTS claims (
            claim_id INT AUTO_INCREMENT PRIMARY KEY,
            item_id INT,
            user_id INT,
            claim_status VARCHAR(20)
        );
    `;

    db.query(usersTable);
    db.query(adminTable);
    db.query(itemsTable);
    db.query(itemsFoundTable);
    db.query(claimsTable);

    console.log("✔ All tables created!");
    db.end();
});

setupDatabase();
