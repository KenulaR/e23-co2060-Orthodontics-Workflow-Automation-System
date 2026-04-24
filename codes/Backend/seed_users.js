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

        const testAccountPassword = process.env.SEED_TEST_PASSWORD?.trim() || 'password123';
        console.log("Encrypting passwords for the full clinical staff...");
        const passwordHash = await bcrypt.hash(testAccountPassword, 10);

        // Array of all 6 roles: [Name, Email, Role, Status]
        const fullStaff = [
            ['System Admin', 'admin@test.com', 'ADMIN', 'ACTIVE'],
            ['Dr. Smith (Ortho)', 'ortho@test.com', 'ORTHODONTIST', 'ACTIVE'],
            ['Dr. Sarah (Surgeon)', 'surgeon@test.com', 'DENTAL_SURGEON', 'ACTIVE'],
            ['Nurse Kelly', 'nurse@test.com', 'NURSE', 'ACTIVE'],
            ['Alex (Student)', 'student@test.com', 'STUDENT', 'ACTIVE'],
            ['Jane (Reception)', 'reception@test.com', 'RECEPTION', 'ACTIVE']
        ];

        for (const [name, email, role, status] of fullStaff) {
            await pool.query(
                `INSERT INTO users (name, email, password_hash, role, status)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   name = VALUES(name),
                   password_hash = VALUES(password_hash),
                   role = VALUES(role),
                   status = VALUES(status)`,
                [name, email, passwordHash, role, status]
            );
        }

        console.log('✅ SUCCESS: All 6 role accounts are ready to use!');
        console.log('Login email/password for seeded users:');
        console.log(`  admin@test.com / ${testAccountPassword}`);
        console.log(`  ortho@test.com / ${testAccountPassword}`);
        console.log(`  surgeon@test.com / ${testAccountPassword}`);
        console.log(`  nurse@test.com / ${testAccountPassword}`);
        console.log(`  student@test.com / ${testAccountPassword}`);
        console.log(`  reception@test.com / ${testAccountPassword}`);
        process.exit();
    } catch (error) {
        console.error("❌ ERROR:", error.message);
        process.exit(1);
    }
}

createAllTestAccounts();
