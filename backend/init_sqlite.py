import sqlite3
import os
from dotenv import load_dotenv

# Load environment variables
backend_path = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(backend_path, '.env')
load_dotenv(env_path)

DB_PATH = os.path.join(backend_path, 'database.sqlite')

def init_sqlite():
    print(f"Initializing SQLite database at: {DB_PATH}")
    
    # Connect to (or create) the database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Read the schema file (adjusted for SQLite)
    schema = """
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      google_id TEXT UNIQUE,
      facebook_id TEXT UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL CHECK (price > 0),
      image_url TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total REAL NOT NULL CHECK (total > 0),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK (quantity > 0)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
    """
    
    # Execute the schema
    cursor.executescript(schema)
    
    # Check if we need to seed some initial products
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        print("Seeding initial products...")
        products = [
            ('Tech Turf Pro Shoes', 'High-performance turf shoes for elite athletes.', 4999.00, '/images/shoes1.jpg'),
            ('Quantum Ball 2026', 'Smart ball with built-in sensors for tracking performance.', 2500.00, '/images/ball1.jpg'),
            ('Elite Grip Gloves', 'Professional goalkeeper gloves with maximum grip.', 1800.00, '/images/gloves1.jpg')
        ]
        cursor.executemany("INSERT INTO products (name, description, price, image_url) VALUES (?, ?, ?, ?)", products)
    
    conn.commit()
    conn.close()
    print("✓ SQLite database initialized successfully.")

if __name__ == "__main__":
    init_sqlite()
