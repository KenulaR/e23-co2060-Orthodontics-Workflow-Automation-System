// codes/Backend/reset.js
require('dotenv').config();
const mysql = require('mysql2/promise');

// Auto-detect which hashing library your project uses
let bcrypt;
try { 
    bcrypt = require('bcrypt'); 
} catch (e) { 
    bcrypt = require('bcryptjs'); 
}

async function fixPassword() {
    try {
        // Connect to your database using your .env settings
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '1234',
            database: process.env.DB_NAME || 'orthoflow'
        });

        console.log("Scrambling '123456' using your system's native encryption...");
        const newHash = await bcrypt.hash('123456', 10);
        
        const [result] = await pool.query(
            "UPDATE users SET password_hash = ? WHERE email = 'admin@test.com'", 
            [newHash]
        );

        if (result.affectedRows > 0) {
            console.log("✅ SUCCESS: Admin password forcefully reset to '123456'!");
        } else {
            console.log("❌ ERROR: Could not find admin@test.com. Did you run the SQL script?");
        }
        process.exit();
    } catch (error) {
        console.error("❌ ERROR:", error.message);
        process.exit(1);
    }
}

fixPassword();