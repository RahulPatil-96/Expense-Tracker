import bcrypt from 'bcryptjs';
import pool from '../db.js';
import {defaultCategories} from '../utils/defaultCategories.js';

const DEMO_USER = {
    name: 'Alex',
    email: 'alex@gmail.com',
    password: 'Test@123',
    currency: 'INR',
};

const BUDGETS = [
    {name: 'Food & Dining', amount: 12000},
    {name: 'Groceries', amount: 8000},
    {name: 'Entertainment', amount: 3000},
    {name: 'Transportation', amount: 5000},
    {name: 'Shopping', amount: 6000},
];

const generateTransactions = (catMap) => {
    const txns = [];
    const today = new Date();

    let seed = 1;
    const rng = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed/0x7fffffff;
    };
    const rangeFloat = (min, max) => min + rng() * (max - min);
    const rangeInt = (min, max) => Math.floor(rangeFloat(min, max + 1));
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];

    for(let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
        const monthStart = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
        const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
        const monthLastDay = monthsAgo === 0 ? today.getDate() : daysInMonth;

        const dateOn = (day) => {
            const year = monthStart.getFullYear();
            const month = monthStart.getMonth() + 1;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        };

        const add = (day, categoryName, amount, type, description) => {
            if(day < 1 || day > monthLastDay) return;
            const catId = catMap[categoryName];
            if(!catId) return;
            txns.push({
                categoryId: catId,
                amount: parseFloat(amount.toFixed(2)),
                type,
                description,
                date: dateOn(day),
            });
        };

        add(1, 'Salary', 45000, 'income', 'Salary deposit');
        add(15, 'Salary', 45000, 'income', 'Salary deposit');

        if(monthsAgo%3 === 1) {
            add(rangeInt(10, 22), 'Freelance', rangeFloat(8000, 25000), 'income', 'Client project');
        }
        if(rng() < 0.5) {
            add(rangeInt(8, 25), 'Other Income', rangeFloat(500, 5000), 'income', pick(['Cashback', 'Refund', 'Interest']));
        }

        add(2, 'Rent', 18000, 'expense', 'Monthly rent');
        add(rangeInt(5, 9), 'Utilities', rangeFloat(1800, 3500), 'expense', 'Electricity');
        add(rangeInt(10, 14), 'Utilities', rangeFloat(700, 1500), 'expense', 'Internet');

        add(3, 'Entertainment', 649, 'expense', 'Netflix');
        add(5, 'Entertainment', 119, 'expense', 'Spotify');
        add(7, 'Entertainment', 129, 'expense', 'YouTube Premium');

        for(let day = 1; day <= monthLastDay; day++) {
            const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
            const dow = d.getDay();
            const isWeekend = dow === 0 || dow === 6;

            if(!isWeekend && rng() < 0.8) {
                add(day, 'Food & Dining', rangeFloat(40, 120), 'expense', pick(['Tea', 'Coffee', 'Cafe Visit']));
            }
            if(!isWeekend && rng() < 0.55) {
                add(day, 'Food & Dining', rangeFloat(120, 350), 'expense', pick(['Lunch', 'Office Lunch', 'Snack']));
            }
            if(isWeekend && rng() < 0.5) {
                add(day, 'Food & Dining', rangeFloat(500, 2000), 'expense', pick(['Dinner Out', 'Restaurant', 'Family Dinner']));
            }
            if(isWeekend && rng() < 0.4) {
                add(day,'Transportation', rangeFloat(50, 250), 'expense', pick(['Metro', 'Auto Rickshaw', 'Parking']));
            }
            if(rng() < 0.15) {
                add(day, 'Shopping', rangeFloat(500, 4000), 'expense', 'Online Shopping');
            }
        }

        for(let day = 4; day <= monthLastDay; day += 7) {
            const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
            if(d.getDay() === 0) {
                add(day, 'Groceries', rangeFloat(1500, 4500), 'expense', pick(['D-Mart', 'Reliance Smart', 'Weekly Groceries']));
            }
        }

        for(let day = 4; day <= monthLastDay; day += 7) {
            add(day, 'Transportation', rangeFloat(1000, 3000), 'expense', 'Gas');
        }

        if(monthsAgo%2 === 0) {
            add(rangeInt(8, 25), 'Shopping', rangeFloat(2500, 12000), 'expense', pick(['Clothes', 'New Shoes']));
        }
        if([10, 6, 2].includes(monthsAgo)) {
            add(rangeInt(10, 20), 'Healthcare', rangeFloat(1000, 5000), 'expense', 'Doctor visit');
        }
        if(monthsAgo%2 === 0) {
            add(rangeInt(8, 14), 'Personal Care', rangeFloat(200, 800), 'expense', 'Haircut');
        }
        if([11, 7, 3].includes(monthsAgo)) {
            add(rangeInt(15, 22), 'Travel', rangeFloat(5000, 20000), 'expense', 'Weekend trip');
        }
    }

    return txns;
}

const generateBorrowLendTransactions = () => {
    const txns = [];
    const today = new Date();
    
    let seed = 7;
    const rng = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    const rangeInt = (min, max) => Math.floor(min + rng() * (max - min + 1));

    const dateOn = (monthsAgo, dayOfMonth) => {
        const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, dayOfMonth);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T09:30:00.000Z`;
    };

    const people = [
        { name: 'Rahul', borrowAmt: 2500, lentAmt: 1800 },
        { name: 'Priya', borrowAmt: 4200, lentAmt: 0 },
        { name: 'Neha', borrowAmt: 0, lentAmt: 5200 },
        { name: 'Vikram', borrowAmt: 3000, lentAmt: 2500 },
        { name: 'Sara', borrowAmt: 1500, lentAmt: 0 },
    ];

    const reasonsBorrow = ['Dinner bill', 'Cab fare', 'Emergency help', 'Groceries', 'Movie tickets'];
    const reasonsLent = ['Festival advance', 'Wedding gift loan', 'Project support', 'Book purchase', 'Medical help'];

    for (const p of people) {
        if (p.borrowAmt > 0) {
            txns.push({
                transaction_type: 'BORROWED',
                person_name: p.name,
                amount: p.borrowAmt,
                reason: reasonsBorrow[rangeInt(0, reasonsBorrow.length - 1)],
                status: 'PENDING',
                transaction_date: dateOn(rangeInt(0, 8), rangeInt(1, 25)),
                notes: 'Seeded demo borrow (outstanding)',
                settled_at: null,
            });

            txns.push({
                transaction_type: 'BORROWED',
                person_name: p.name,
                amount: parseFloat((p.borrowAmt * 1.25).toFixed(2)),
                reason: reasonsBorrow[rangeInt(0, reasonsBorrow.length - 1)],
                status: 'REPAID',
                transaction_date: dateOn(rangeInt(4, 11), rangeInt(1, 28)),
                notes: 'Seeded demo borrow (settled)',
                settled_at: new Date().toISOString(),
            });
        }

        if (p.lentAmt > 0) {
            txns.push({
                transaction_type: 'LENT',
                person_name: p.name,
                amount: p.lentAmt,
                reason: reasonsLent[rangeInt(0, reasonsLent.length - 1)],
                status: 'PENDING',
                transaction_date: dateOn(rangeInt(0, 8), rangeInt(1, 25)),
                notes: 'Seeded demo lent (to receive)',
                settled_at: null,
            });

            txns.push({
                transaction_type: 'LENT',
                person_name: p.name,
                amount: parseFloat((p.lentAmt * 0.85).toFixed(2)),
                reason: reasonsLent[rangeInt(0, reasonsLent.length - 1)],
                status: 'RECEIVED',
                transaction_date: dateOn(rangeInt(4, 11), rangeInt(1, 28)),
                notes: 'Seeded demo lent (settled)',
                settled_at: new Date().toISOString(),
            });
        }
    }

    txns.push({
        transaction_type: 'BORROWED',
        person_name: 'Karan',
        amount: 6000,
        reason: 'Laptop repair',
        status: 'PENDING',
        transaction_date: dateOn(1, 12),
        notes: 'Seeded demo borrow (pending)',
        settled_at: null,
    });
    txns.push({
        transaction_type: 'LENT',
        person_name: 'Kavya',
        amount: 7200,
        reason: 'Rent advance',
        status: 'PENDING',
        transaction_date: dateOn(2, 18),
        notes: 'Seeded demo lent (pending)',
        settled_at: null,
    });

    return txns;
};

const seed = async () => {
    const client = await pool.connect();

    try {
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [DEMO_USER.email]);
        if(existing.rows.length > 0) {
            console.log(`Removing existing demo user (${DEMO_USER.email})...`);
            await client.query('DELETE FROM users WHERE email= $1', [DEMO_USER.email]);
        }

        await client.query('BEGIN');

        console.log(`Creating user ${DEMO_USER.email}...`);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(DEMO_USER.password,salt);
        const userResult = await client.query(
            `INSERT INTO users (name, email, password_hash, currency)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [DEMO_USER.name, DEMO_USER.email, passwordHash, DEMO_USER.currency]
        );
        const userId = userResult.rows[0].id;

        console.log(`Seeding ${defaultCategories.length} default categories...`);
        for(const cat of defaultCategories) {
            await client.query(
                `INSERT INTO categories (user_id, name, type, icon, color, is_default)
                 VALUES ($1, $2, $3, $4, $5, true)`,
                [userId, cat.name, cat.type, cat.icon, cat.color]
            );
        }

        const catRes = await client.query(
            `SELECT id, name FROM categories WHERE user_id = $1`,
            [userId]
        );
        const catMap = {};
        catRes.rows.forEach((c) => {
            catMap[c.name] = c.id;
        });

        const transactions = generateTransactions(catMap);
        console.log(`Inserting ${transactions.length} transactions across 12 months...`);

        const borrowLendTxns = generateBorrowLendTransactions();
        console.log(`Inserting ${borrowLendTxns.length} borrow & lend transactions...`);


        const borrowPlaceholders = [];
        const borrowParams = [];
        borrowLendTxns.forEach((t, i) => {
            const base = i * 8;
            borrowPlaceholders.push(
                `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
            );
            borrowParams.push(
                userId,
                t.transaction_type,
                t.person_name,
                t.amount,
                t.reason || null,
                t.status,
                t.transaction_date,
                t.notes || null
            );
        });

        if (borrowPlaceholders.length > 0) {
            await client.query(
                `INSERT INTO borrow_lend_transactions (user_id, transaction_type, person_name, amount, reason, status, transaction_date, notes)
                 VALUES ${borrowPlaceholders.join(', ')}`,
                borrowParams
            );
        }

        const placeholders = [];
        const params = [];

        transactions.forEach((t, i) => {
            const base = i*6;
            placeholders.push(
                `($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6})`
            );
            params.push(userId, t.categoryId, t.amount, t.type, t.description, t.date);
        });
        if(placeholders.length > 0) {
            await client.query(
                `INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date)
                 VALUES ${placeholders.join(', ')}`,
                params
            );
        }

        const today = new Date();
        const monthStartStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

        console.log(`Inserting ${BUDGETS.length} budgets...`);
        for(const b of BUDGETS) {
            await client.query(
                `INSERT INTO budgets (user_id, category_id, amount, period, start_date)
                 VALUES ($1, $2, $3, 'monthly', $4)`,
                [userId, catMap[b.name], b.amount, monthStartStr]
            );
        }

        await client.query('COMMIT');

        console.log('');        
        console.log('Demo data seeded successfully');
        console.log('');
        console.log('   Email:  alex@gmail.com');
        console.log('   Password: Test@123');
        console.log('');        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Seed failed: ', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
};

seed();