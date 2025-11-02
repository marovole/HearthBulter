-- Create shopping_list_shares table
CREATE TABLE shopping_list_shares (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_by TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX shopping_list_shares_token_idx ON shopping_list_shares(token);
CREATE INDEX shopping_list_shares_expires_at_idx ON shopping_list_shares(expires_at);

-- Add foreign key constraint
ALTER TABLE shopping_list_shares 
ADD CONSTRAINT shopping_list_shares_list_id_fkey 
FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE;
