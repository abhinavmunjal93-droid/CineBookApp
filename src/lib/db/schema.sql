-- CineBook Complete PostgreSQL Migration Schema
-- Conforms to: UUID primary keys, UTC timestamps, Integer minor units for currency,
-- Validation constraints, Indexes, Foreign keys, and Unique constraints.


-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Movies
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    synopsis TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    backdrop_url TEXT NOT NULL,
    trailer_url TEXT,
    duration_mins INT NOT NULL CHECK (duration_mins > 0),
    release_date DATE NOT NULL,
    age_rating VARCHAR(16) NOT NULL CHECK (age_rating IN ('G', 'PG', 'PG-13', 'R', 'NC-17')),
    language VARCHAR(64) NOT NULL DEFAULT 'English',
    rating_score NUMERIC(3, 1) DEFAULT 4.8,
    status VARCHAR(32) NOT NULL DEFAULT 'NOW_SHOWING' CHECK (status IN ('NOW_SHOWING', 'COMING_SOON', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Genres
CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) UNIQUE NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL
);

-- 4. Movie Genres
CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

-- 5. Cinemas
CREATE TABLE IF NOT EXISTS cinemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    phone VARCHAR(50),
    amenities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Auditoriums (Screen within cinema)
CREATE TABLE IF NOT EXISTS auditoriums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cinema_id UUID NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    screen_type VARCHAR(50) NOT NULL DEFAULT 'STANDARD' CHECK (screen_type IN ('STANDARD', 'IMAX_3D', 'DOLBY_CINEMA', '4DX')),
    total_seats INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cinema_screen_name UNIQUE (cinema_id, name)
);

-- 7. Seats (Physical seats in auditorium)
CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditorium_id UUID NOT NULL REFERENCES auditoriums(id) ON DELETE CASCADE,
    row VARCHAR(5) NOT NULL,
    number INT NOT NULL CHECK (number > 0),
    tier VARCHAR(32) NOT NULL DEFAULT 'REGULAR' CHECK (tier IN ('REGULAR', 'PREMIUM', 'VIP', 'ACCESSIBLE')),
    CONSTRAINT uq_auditorium_seat_position UNIQUE (auditorium_id, row, number)
);

-- 8. Showtimes
CREATE TABLE IF NOT EXISTS showtimes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    auditorium_id UUID NOT NULL REFERENCES auditoriums(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    base_price_cents INT NOT NULL CHECK (base_price_cents > 0),
    format VARCHAR(50) NOT NULL DEFAULT 'STANDARD' CHECK (format IN ('STANDARD', 'IMAX_3D', 'DOLBY_CINEMA', '4DX')),
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Showtime Seats (Inventory & state for each showtime)
CREATE TABLE IF NOT EXISTS showtime_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED')),
    hold_expires_at TIMESTAMPTZ,
    held_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    booking_id UUID,
    price_cents INT NOT NULL CHECK (price_cents > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_showtime_seat_booking UNIQUE (showtime_id, seat_id)
);

-- 10. Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED')),
    subtotal_cents INT NOT NULL CHECK (subtotal_cents >= 0),
    fee_cents INT NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
    tax_cents INT NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
    total_cents INT NOT NULL CHECK (total_cents >= 0),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Foreign key for showtime_seats.booking_id -> bookings.id
DO $$
BEGIN
  ALTER TABLE bookings ALTER COLUMN reference TYPE VARCHAR(64);
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_showtime_seats_booking'
  ) THEN
    ALTER TABLE showtime_seats
      ADD CONSTRAINT fk_showtime_seats_booking
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 11. Booking Items
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    showtime_seat_id UUID NOT NULL REFERENCES showtime_seats(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    seat_row VARCHAR(5) NOT NULL,
    seat_number INT NOT NULL,
    seat_tier VARCHAR(32) NOT NULL,
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_booking_showtime_seat UNIQUE (booking_id, showtime_seat_id)
);

-- 12. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'STRIPE_TEST',
    transaction_ref VARCHAR(128),
    amount_cents INT NOT NULL CHECK (amount_cents >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    ticket_number VARCHAR(64) UNIQUE NOT NULL,
    qr_code_data TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_in_at TIMESTAMPTZ
);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_movies_status ON movies(status);
CREATE INDEX IF NOT EXISTS idx_movies_release ON movies(release_date);
CREATE INDEX IF NOT EXISTS idx_showtimes_movie_start ON showtimes(movie_id, start_time);
CREATE INDEX IF NOT EXISTS idx_showtimes_auditorium ON showtimes(auditorium_id);
CREATE INDEX IF NOT EXISTS idx_showtime_seats_showtime_status ON showtime_seats(showtime_id, status);
CREATE INDEX IF NOT EXISTS idx_showtime_seats_held_expires ON showtime_seats(status, hold_expires_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_tickets_booking ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
