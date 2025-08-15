-- Users Table
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table
CREATE TABLE sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Settings Tables
CREATE TABLE speech_settings (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    preferred_voice_name VARCHAR(255),
    speech_rate DECIMAL(3,2) DEFAULT 1.0,
    is_muted BOOLEAN DEFAULT FALSE,
    voice_region VARCHAR(10) DEFAULT 'US',
    preserve_special BOOLEAN DEFAULT FALSE
);

CREATE TABLE translation_settings (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    translation_lang VARCHAR(10) DEFAULT ''
);

-- Custom Words Table
CREATE TABLE custom_words (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage Tracking Tables
CREATE TABLE daily_usage (
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    total_time_ms BIGINT DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, usage_date)
);

CREATE TABLE stickers (
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    sticker_date DATE NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, sticker_date)
);

CREATE TABLE streak_days (
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, streak_date)
);

CREATE TABLE badges (
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    badge_key VARCHAR(255) NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_redeemed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, badge_key)
);

CREATE TABLE word_counts (
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    count INTEGER DEFAULT 0,
    last_shown TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, word, category)
);

-- Session Tracking Tables
CREATE TABLE user_sessions (
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    speech_unlocked BOOLEAN DEFAULT FALSE,
    current_displayed_word VARCHAR(255),
    current_text_being_spoken TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, session_id)
);

CREATE TABLE notification_subscriptions (
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    subscription_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE last_word_positions (
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    last_word VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, category)
);

-- Indexes
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE INDEX idx_daily_usage_date ON daily_usage(usage_date);
CREATE INDEX idx_word_counts_user ON word_counts(user_id);
CREATE INDEX idx_user_sessions_activity ON user_sessions(last_activity);