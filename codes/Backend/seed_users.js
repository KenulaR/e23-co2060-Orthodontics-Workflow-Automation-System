// codes/Backend/seed_users.js
require('dotenv').config();
const mysql = require('mysql2/promise');

let bcrypt;
try { 
    bcrypt = require('bcrypt'); 
} catch (e) { 
    bcrypt = require('bcryptjs'); 
}

async function createAllTestAccounts() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '1234',
            database: process.env.DB_NAME || 'orthoflow'
        });

        console.log("Encrypting passwords for the full clinical staff...");
        const passwordHash = await bcrypt.hash('123456', 10);
        
        // Array of all 6 roles: [Name, Email, Hash, Role, Status]
        const fullStaff = [
            ['System Admin', 'admin@test.com', passwordHash, 'ADMIN', 'ACTIVE'],
            ['Dr. Smith (Ortho)', 'ortho@test.com', passwordHash, 'ORTHODONTIST', 'ACTIVE'],
            ['Dr. Sarah (Surgeon)', 'surgeon@test.com', passwordHash, 'DENTAL_SURGEON', 'ACTIVE'],
            ['Nurse Kelly', 'nurse@test.com', passwordHash, 'NURSE', 'ACTIVE'],
            ['Alex (Student)', 'student@test.com', passwordHash, 'STUDENT', 'ACTIVE'],
            ['Jane (Reception)', 'reception@test.com', passwordHash, 'RECEPTION', 'ACTIVE']
        ];

        for (const user of fullStaff) {
            // Using INSERT IGNORE so it doesn't crash if the admin or surgeon already exist
            await pool.query(
                "INSERT IGNORE INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)", 
                user
            );
        }

        console.log("✅ SUCCESS: All 6 role accounts are ready to use!");
        process.exit();
    } catch (error) {
        console.error("❌ ERROR:", error.message);
        process.exit(1);
    }
}

createAllTestAccounts();