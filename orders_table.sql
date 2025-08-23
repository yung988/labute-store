-- Tabulka pro objednávky
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_session_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('pickup', 'home_delivery')),
    
    -- Pro home delivery
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_postal_code TEXT,
    
    -- Pro pickup point
    pickup_point_id TEXT,
    pickup_point_name TEXT,
    pickup_point_address TEXT,
    
    -- Platba
    amount_total INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'czk',
    payment_status TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pro rychlé vyhledávání
CREATE INDEX idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- RLS (Row Level Security) - zatím povolíme vše
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on orders" ON orders
    FOR ALL USING (true);

-- Tabulka pro položky objednávky
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    size TEXT,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- RLS pro order items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on order_items" ON order_items
    FOR ALL USING (true);