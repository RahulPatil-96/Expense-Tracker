CREATE TABLE users (
    id SERIAL PRIMARY key,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
    id SERIAL PRIMARY key,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN('income', 'expense')),
    icon VARCHAR(50),
    color VARCHAR(7),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, name, type)
);

CREATE TABLE transactions (
    id SERIAL PRIMARY key,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK(amount > 0),
    type VARCHAR(10) NOT NULL CHECK (type IN('income', 'expense')),
    description VARCHAR(255),
    notes TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_txn_user_data ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_txn_category ON transactions(category_id);

CREATE TABLE budgets (
    id SERIAL PRIMARY key,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK(amount > 0),
    period VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK(period IN('monthly', 'weekly')),
    start_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, category_id, period)
);

CREATE TABLE ai_insights (
    id SERIAL PRIMARY key,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    period_start DATE,
    period_end DATE,
    content_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE INDEX idx_insights_user_created ON ai_insights(user_id, created_at DESC);

CREATE TABLE borrow_lend_transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('BORROWED', 'LENT')),
    person_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'REPAID', 'RECEIVED')),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_borrow_lend_status CHECK (
        (transaction_type = 'BORROWED' AND status IN ('PENDING', 'REPAID')) OR
        (transaction_type = 'LENT' AND status IN ('PENDING', 'RECEIVED'))
    )
);

CREATE INDEX idx_borrow_lend_user_person ON borrow_lend_transactions(user_id, person_name);
CREATE INDEX idx_borrow_lend_date ON borrow_lend_transactions(user_id, transaction_date DESC);