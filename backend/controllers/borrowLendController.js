import pool from '../db.js';
import { analyzeBorrowLend } from '../utils/gemini.js';

export const addTransaction = async (req, res) => {
    const { transaction_type, person_name, amount, reason, transaction_date, notes } = req.body;

    if (!transaction_type || !person_name || !amount) {
        return res.status(400).json({ message: 'Transaction type, person name, and amount are required' });
    }

    if (!['BORROWED', 'LENT'].includes(transaction_type)) {
        return res.status(400).json({ message: 'Transaction type must be BORROWED or LENT' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO borrow_lend_transactions 
                (user_id, transaction_type, person_name, amount, reason, status, transaction_date, notes)
             VALUES ($1, $2, $3, $4, $5, 'PENDING', COALESCE($6, NOW()), $7)
             RETURNING *`,
            [req.userId, transaction_type, person_name, amount, reason || null, transaction_date || null, notes || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('addTransaction error: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getTransactions = async (req, res) => {
    const { personName, type, status, startDate, endDate } = req.query;

    const conditions = ['user_id = $1'];
    const values = [req.userId];
    let idx = 2;

    if (personName) {
        conditions.push(`person_name ILIKE $${idx}`);
        values.push(`%${personName}%`);
        idx++;
    }

    if (type) {
        conditions.push(`transaction_type = $${idx}`);
        values.push(type);
        idx++;
    }

    if (status) {
        if (status === 'SETTLED') {
            conditions.push(`status IN ('REPAID', 'RECEIVED')`);
        } else {
            conditions.push(`status = $${idx}`);
            values.push(status);
            idx++;
        }
    }

    if (startDate) {
        conditions.push(`transaction_date >= $${idx}`);
        values.push(startDate);
        idx++;
    }

    if (endDate) {
        conditions.push(`transaction_date <= $${idx}`);
        values.push(endDate);
        idx++;
    }

    try {
        const result = await pool.query(
            `SELECT * FROM borrow_lend_transactions
             WHERE ${conditions.join(' AND ')}
             ORDER BY transaction_date DESC, id DESC`,
            values
        );
        res.json(result.rows);
    } catch (error) {
        console.error('getTransactions error: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTransactionStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    try {
        // First get the transaction details
        const txResult = await pool.query(
            `SELECT * FROM borrow_lend_transactions WHERE id = $1 AND user_id = $2`,
            [id, req.userId]
        );

        if (txResult.rows.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const tx = txResult.rows[0];

        // Validate state transitions
        if (tx.transaction_type === 'BORROWED' && !['PENDING', 'REPAID'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status for BORROWED transaction. Must be PENDING or REPAID' });
        }

        if (tx.transaction_type === 'LENT' && !['PENDING', 'RECEIVED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status for LENT transaction. Must be PENDING or RECEIVED' });
        }

        const settledAt = ['REPAID', 'RECEIVED'].includes(status) ? new Date() : null;

        const updateResult = await pool.query(
            `UPDATE borrow_lend_transactions
             SET status = $1, settled_at = $2, updated_at = NOW()
             WHERE id = $3 AND user_id = $4
             RETURNING *`,
            [status, settledAt, id, req.userId]
        );

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('updateTransactionStatus error: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteTransaction = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM borrow_lend_transactions WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('deleteTransaction error: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getSummary = async (req, res) => {
    try {
        const summaryQuery = `
            SELECT
                COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' THEN amount ELSE 0 END), 0) AS total_borrowed,
                COALESCE(SUM(CASE WHEN transaction_type = 'LENT' THEN amount ELSE 0 END), 0) AS total_lent,
                COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' AND status = 'PENDING' THEN amount ELSE 0 END), 0) AS outstanding_borrowed,
                COALESCE(SUM(CASE WHEN transaction_type = 'LENT' AND status = 'PENDING' THEN amount ELSE 0 END), 0) AS outstanding_lent,
                COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_settlements,
                COUNT(CASE WHEN status IN ('REPAID', 'RECEIVED') THEN 1 END) AS completed_settlements
            FROM borrow_lend_transactions
            WHERE user_id = $1
        `;

        const result = await pool.query(summaryQuery, [req.userId]);
        const row = result.rows[0];

        res.json({
            totalBorrowed: parseFloat(row.total_borrowed),
            totalLent: parseFloat(row.total_lent),
            outstandingBorrowed: parseFloat(row.outstanding_borrowed),
            outstandingLent: parseFloat(row.outstanding_lent),
            pendingSettlementsCount: parseInt(row.pending_settlements, 10),
            completedSettlementsCount: parseInt(row.completed_settlements, 10)
        });
    } catch (error) {
        console.error('getSummary error: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPeople = async (req, res) => {
    try {
        const query = `
            SELECT
                person_name,
                COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' THEN amount ELSE 0 END), 0) AS total_borrowed,
                COALESCE(SUM(CASE WHEN transaction_type = 'LENT' THEN amount ELSE 0 END), 0) AS total_lent,
                COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' AND status = 'REPAID' THEN amount ELSE 0 END), 0) AS total_repaid,
                COALESCE(SUM(CASE WHEN transaction_type = 'LENT' AND status = 'RECEIVED' THEN amount ELSE 0 END), 0) AS total_received,
                (COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' AND status = 'REPAID' THEN amount ELSE 0 END), 0)) AS outstanding_borrowed,
                (COALESCE(SUM(CASE WHEN transaction_type = 'LENT' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN transaction_type = 'LENT' AND status = 'RECEIVED' THEN amount ELSE 0 END), 0)) AS outstanding_lent
            FROM borrow_lend_transactions
            WHERE user_id = $1
            GROUP BY person_name
            ORDER BY person_name
        `;

        const result = await pool.query(query, [req.userId]);

        const people = result.rows.map((row) => {
            const ob = parseFloat(row.outstanding_borrowed);
            const ol = parseFloat(row.outstanding_lent);
            return {
                personName: row.person_name,
                totalBorrowed: parseFloat(row.total_borrowed),
                totalLent: parseFloat(row.total_lent),
                totalRepaid: parseFloat(row.total_repaid),
                totalReceived: parseFloat(row.total_received),
                outstandingBorrowed: ob,
                outstandingLent: ol,
                netSettlement: ol - ob // positive means they owe user, negative means user owes them
            };
        });

        res.json(people);
    } catch (error) {
        console.error('getPeople error: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPersonDetails = async (req, res) => {
    const { name } = req.params;

    try {
        const summaryQuery = `
            SELECT
                person_name,
                COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' THEN amount ELSE 0 END), 0) AS total_borrowed,
                COALESCE(SUM(CASE WHEN transaction_type = 'LENT' THEN amount ELSE 0 END), 0) AS total_lent,
                COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' AND status = 'REPAID' THEN amount ELSE 0 END), 0) AS total_repaid,
                COALESCE(SUM(CASE WHEN transaction_type = 'LENT' AND status = 'RECEIVED' THEN amount ELSE 0 END), 0) AS total_received,
                (COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN transaction_type = 'BORROWED' AND status = 'REPAID' THEN amount ELSE 0 END), 0)) AS outstanding_borrowed,
                (COALESCE(SUM(CASE WHEN transaction_type = 'LENT' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN transaction_type = 'LENT' AND status = 'RECEIVED' THEN amount ELSE 0 END), 0)) AS outstanding_lent
            FROM borrow_lend_transactions
            WHERE user_id = $1 AND person_name = $2
            GROUP BY person_name
        `;

        const txQuery = `
            SELECT * FROM borrow_lend_transactions
            WHERE user_id = $1 AND person_name = $2
            ORDER BY transaction_date DESC, id DESC
        `;

        const [summaryResult, txResult] = await Promise.all([
            pool.query(summaryQuery, [req.userId, name]),
            pool.query(txQuery, [req.userId, name])
        ]);

        if (summaryResult.rows.length === 0) {
            return res.status(404).json({ message: 'Person not found' });
        }

        const row = summaryResult.rows[0];
        const ob = parseFloat(row.outstanding_borrowed);
        const ol = parseFloat(row.outstanding_lent);

        res.json({
            summary: {
                personName: row.person_name,
                totalBorrowed: parseFloat(row.total_borrowed),
                totalLent: parseFloat(row.total_lent),
                totalRepaid: parseFloat(row.total_repaid),
                totalReceived: parseFloat(row.total_received),
                outstandingBorrowed: ob,
                outstandingLent: ol,
                netSettlement: ol - ob
            },
            transactions: txResult.rows
        });
    } catch (error) {
        console.error('getPersonDetails error: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAiInsights = async (req, res) => {
    try {
        // Fetch all transactions to give full context to Gemini
        const result = await pool.query(
            `SELECT transaction_type, person_name, amount, status, transaction_date, reason
             FROM borrow_lend_transactions
             WHERE user_id = $1`,
            [req.userId]
        );

        const userRes = await pool.query('SELECT currency FROM users WHERE id = $1', [req.userId]);
        const currency = userRes.rows[0]?.currency || 'INR';

        const insights = await analyzeBorrowLend({
            transactions: result.rows,
            currency
        });

        res.json(insights);
    } catch (error) {
        console.error('getAiInsights error: ', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};
