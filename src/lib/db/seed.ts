import bcrypt from 'bcryptjs';
import { getDb, withTransaction } from './client';

export async function runSeed() {
  console.log('🌱 Seeding CineBook database with sample cinema data...');
  const db = await getDb();

  // 1. Seed Users
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const userPasswordHash = await bcrypt.hash('UserPassword123!', 10);

  const adminRes = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, 'ADMIN')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'ADMIN'
     RETURNING id;`,
    ['admin@cinebook.com', adminPasswordHash, 'Eleanor Vance (Operations Director)']
  );
  const adminId = adminRes.rows[0].id;

  const userRes = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, 'CUSTOMER')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id;`,
    ['user@cinebook.com', userPasswordHash, 'Alex Mercer']
  );
  const userId = userRes.rows[0].id;

  const qaUserRes = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, 'CUSTOMER')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id;`,
    ['qa@cinebook.com', userPasswordHash, 'Jordan Reed']
  );

  console.log('👤 Users seeded (Admin: admin@cinebook.com, Customer: user@cinebook.com)');

  // 2. Seed Genres
  const genres = [
    { name: 'Sci-Fi', slug: 'sci-fi' },
    { name: 'Action', slug: 'action' },
    { name: 'Drama', slug: 'drama' },
    { name: 'Adventure', slug: 'adventure' },
    { name: 'Animation', slug: 'animation' },
    { name: 'Biography', slug: 'biography' },
    { name: 'Crime', slug: 'crime' },
    { name: 'Fantasy', slug: 'fantasy' },
    { name: 'Thriller', slug: 'thriller' },
  ];

  const genreMap = new Map<string, string>();
  for (const g of genres) {
    const res = await db.query(
      `INSERT INTO genres (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`,
      [g.name, g.slug]
    );
    genreMap.set(g.slug, res.rows[0].id);
  }

  // 3. Seed Movies
  const movies = [
    {
      title: 'Dune: Part Two',
      slug: 'dune-part-two',
      synopsis:
        'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.',
      poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=Way9Dexny3w',
      duration_mins: 166,
      release_date: '2024-03-01',
      age_rating: 'PG-13',
      language: 'English',
      rating_score: 4.9,
      status: 'NOW_SHOWING',
      genres: ['sci-fi', 'adventure', 'action'],
    },
    {
      title: 'Oppenheimer',
      slug: 'oppenheimer',
      synopsis:
        'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II, exploring the moral and geopolitical ramifications of humanity’s ultimate weapon.',
      poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
      duration_mins: 180,
      release_date: '2023-07-21',
      age_rating: 'R',
      language: 'English',
      rating_score: 4.8,
      status: 'NOW_SHOWING',
      genres: ['biography', 'drama', 'history'],
    },
    {
      title: 'Spider-Man: Across the Spider-Verse',
      slug: 'spider-man-across-the-spider-verse',
      synopsis:
        'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash on how to handle a new threat, Miles must redefine what it means to be a hero.',
      poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&auto=format&fit=crop&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1600&auto=format&fit=crop&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=cqGjhVJWtEg',
      duration_mins: 140,
      release_date: '2023-06-02',
      age_rating: 'PG',
      language: 'English',
      rating_score: 4.9,
      status: 'NOW_SHOWING',
      genres: ['animation', 'action', 'adventure'],
    },
    {
      title: 'Interstellar (10th Anniversary IMAX Re-Release)',
      slug: 'interstellar-imax',
      synopsis:
        'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.',
      poster_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      duration_mins: 169,
      release_date: '2024-09-27',
      age_rating: 'PG-13',
      language: 'English',
      rating_score: 4.9,
      status: 'NOW_SHOWING',
      genres: ['sci-fi', 'drama', 'adventure'],
    },
    {
      title: 'The Batman: Part II',
      slug: 'the-batman-part-two',
      synopsis:
        'The dark detective returns to investigate Gotham’s deeply corrupt criminal underworld and a new psychological menace emerging from the shadowed depths of Arkham.',
      poster_url: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&auto=format&fit=crop&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
      trailer_url: '',
      duration_mins: 165,
      release_date: '2026-10-02',
      age_rating: 'PG-13',
      language: 'English',
      rating_score: 4.8,
      status: 'COMING_SOON',
      genres: ['action', 'crime', 'drama'],
    },
  ];

  const movieMap = new Map<string, string>();
  for (const m of movies) {
    const res = await db.query(
      `INSERT INTO movies (title, slug, synopsis, poster_url, backdrop_url, trailer_url, duration_mins, release_date, age_rating, language, rating_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         synopsis = EXCLUDED.synopsis,
         poster_url = EXCLUDED.poster_url,
         backdrop_url = EXCLUDED.backdrop_url,
         status = EXCLUDED.status
       RETURNING id;`,
      [
        m.title,
        m.slug,
        m.synopsis,
        m.poster_url,
        m.backdrop_url,
        m.trailer_url,
        m.duration_mins,
        m.release_date,
        m.age_rating,
        m.language,
        m.rating_score,
        m.status,
      ]
    );
    const movieId = res.rows[0].id;
    movieMap.set(m.slug, movieId);

    for (const gSlug of m.genres) {
      const gId = genreMap.get(gSlug);
      if (gId) {
        await db.query(
          `INSERT INTO movie_genres (movie_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [movieId, gId]
        );
      }
    }
  }
  console.log(`🎬 Seeded ${movies.length} movies with genre relationships`);

  // 4. Seed Cinemas
  const cinemas = [
    {
      name: 'CineBook Grand IMAX Cinema',
      slug: 'cinebook-grand-imax',
      address: '1200 Cinema Way, Suite 400',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      phone: '+1 (212) 555-0199',
      amenities: JSON.stringify([
        'IMAX Laser Dual 4K',
        'Dolby Atmos 128ch',
        'Luxury Leather Recliners',
        'Gourmet Dine-In Service',
        'Reserved Parking & Valet',
      ]),
    },
    {
      name: 'Apex Dolby Cinema at Lincoln Center',
      slug: 'apex-dolby-lincoln',
      address: '845 Broadway',
      city: 'New York',
      state: 'NY',
      postal_code: '10023',
      phone: '+1 (212) 555-0245',
      amenities: JSON.stringify([
        'Dolby Vision & Dolby Atmos',
        '4DX Dynamic Motion Seats',
        'Heated Recliners',
        'Craft Cocktail Lounge',
      ]),
    },
    {
      name: 'Starlight Cineplex & VIP Lounge',
      slug: 'starlight-cineplex-la',
      address: '450 Sunset Blvd',
      city: 'Los Angeles',
      state: 'CA',
      postal_code: '90028',
      phone: '+1 (323) 555-0177',
      amenities: JSON.stringify([
        'Private VIP Suites',
        'Laser 4K Projection',
        'In-Seat Wine & Dining',
        'Dolby Surround 7.1',
      ]),
    },
  ];

  const cinemaMap = new Map<string, string>();
  for (const c of cinemas) {
    const res = await db.query(
      `INSERT INTO cinemas (name, slug, address, city, state, postal_code, phone, amenities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address
       RETURNING id;`,
      [c.name, c.slug, c.address, c.city, c.state, c.postal_code, c.phone, c.amenities]
    );
    cinemaMap.set(c.slug, res.rows[0].id);
  }
  console.log(`🏛️ Seeded ${cinemas.length} Cinemas`);

  // 5. Seed Auditoriums & Seats
  const auditoriumsData = [
    {
      cinemaSlug: 'cinebook-grand-imax',
      name: 'Auditorium 1 - IMAX Laser Experience',
      screenType: 'IMAX_3D',
      rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      seatsPerRow: 12,
    },
    {
      cinemaSlug: 'cinebook-grand-imax',
      name: 'Auditorium 2 - Dolby Atmos Prime',
      screenType: 'DOLBY_CINEMA',
      rows: ['A', 'B', 'C', 'D', 'E', 'F'],
      seatsPerRow: 10,
    },
    {
      cinemaSlug: 'apex-dolby-lincoln',
      name: 'Auditorium 1 - Dolby Cinema Hall',
      screenType: 'DOLBY_CINEMA',
      rows: ['A', 'B', 'C', 'D', 'E', 'F'],
      seatsPerRow: 10,
    },
    {
      cinemaSlug: 'apex-dolby-lincoln',
      name: 'Auditorium 2 - 4DX Motion Theater',
      screenType: '4DX',
      rows: ['A', 'B', 'C', 'D'],
      seatsPerRow: 8,
    },
    {
      cinemaSlug: 'starlight-cineplex-la',
      name: 'Auditorium 1 - VIP Luxe Lounge',
      screenType: 'STANDARD',
      rows: ['A', 'B', 'C', 'D', 'E'],
      seatsPerRow: 10,
    },
  ];

  const createdAuditoriums: { id: string; screenType: string; totalSeats: number }[] = [];

  for (const aud of auditoriumsData) {
    const cId = cinemaMap.get(aud.cinemaSlug);
    if (!cId) continue;

    const totalSeats = aud.rows.length * aud.seatsPerRow;
    const res = await db.query(
      `INSERT INTO auditoriums (cinema_id, name, screen_type, total_seats)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cinema_id, name) DO UPDATE SET screen_type = EXCLUDED.screen_type, total_seats = EXCLUDED.total_seats
       RETURNING id;`,
      [cId, aud.name, aud.screenType, totalSeats]
    );
    const audId = res.rows[0].id;
    createdAuditoriums.push({ id: audId, screenType: aud.screenType, totalSeats });

    // Seed physical seats
    for (let rIdx = 0; rIdx < aud.rows.length; rIdx++) {
      const rowLetter = aud.rows[rIdx];
      // Tier logic:
      // Last 2 rows: VIP (Luxury recliners)
      // Middle rows: PREMIUM
      // Front rows: REGULAR
      let tier = 'REGULAR';
      if (rIdx >= aud.rows.length - 2) {
        tier = 'VIP';
      } else if (rIdx >= 2) {
        tier = 'PREMIUM';
      }

      for (let sNum = 1; sNum <= aud.seatsPerRow; sNum++) {
        // Seat tier override for accessible front aisle
        let seatTier = tier;
        if (rIdx === 0 && (sNum === 1 || sNum === aud.seatsPerRow)) {
          seatTier = 'ACCESSIBLE';
        }

        await db.query(
          `INSERT INTO seats (auditorium_id, row, number, tier)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (auditorium_id, row, number) DO UPDATE SET tier = EXCLUDED.tier;`,
          [audId, rowLetter, sNum, seatTier]
        );
      }
    }
  }
  console.log(`💺 Seeded ${createdAuditoriums.length} Auditoriums and their physical seats`);

  // 6. Seed Showtimes & Showtime Seats
  // Create showtimes for today, tomorrow, and +2 days
  const duneId = movieMap.get('dune-part-two');
  const oppenheimerId = movieMap.get('oppenheimer');
  const spidermanId = movieMap.get('spider-man-across-the-spider-verse');
  const interstellarId = movieMap.get('interstellar-imax');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const targetMovies = [
    { id: duneId, title: 'Dune: Part Two', basePrice: 2200 }, // $22.00
    { id: oppenheimerId, title: 'Oppenheimer', basePrice: 1900 }, // $19.00
    { id: spidermanId, title: 'Spider-Man: Across the Spider-Verse', basePrice: 1700 }, // $17.00
    { id: interstellarId, title: 'Interstellar', basePrice: 2400 }, // $24.00
  ].filter((m) => m.id !== undefined);

  let showtimeCount = 0;
  let sampleShowtimeIdForBooking = '';

  for (let dayOffset = 0; dayOffset <= 3; dayOffset++) {
    const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dateYMD = targetDate.toISOString().split('T')[0];

    // Show times: 13:00, 16:30, 19:45, 22:30
    const timeSlots = [
      { start: '13:00:00Z', end: '15:45:00Z' },
      { start: '16:30:00Z', end: '19:15:00Z' },
      { start: '19:45:00Z', end: '22:30:00Z' },
      { start: '22:45:00Z', end: '01:30:00Z' },
    ];

    for (let i = 0; i < createdAuditoriums.length; i++) {
      const aud = createdAuditoriums[i];
      const movie = targetMovies[i % targetMovies.length];
      const slot = timeSlots[i % timeSlots.length];

      const startTimeStr = `${dateYMD}T${slot.start}`;
      const endTimeStr = `${dateYMD}T${slot.end}`;

      // Check if showtime already exists
      const existing = await db.query(
        `SELECT id FROM showtimes WHERE movie_id = $1 AND auditorium_id = $2 AND start_time = $3;`,
        [movie.id, aud.id, startTimeStr]
      );

      let showtimeId: string;
      if (existing.rows.length > 0) {
        showtimeId = existing.rows[0].id;
      } else {
        const stRes = await db.query(
          `INSERT INTO showtimes (movie_id, auditorium_id, start_time, end_time, base_price_cents, format, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED')
           RETURNING id;`,
          [movie.id, aud.id, startTimeStr, endTimeStr, movie.basePrice, aud.screenType]
        );
        showtimeId = stRes.rows[0].id;
        // Populate showtime_seats only for freshly created showtimes
        const seatsRes = await db.query(`SELECT id, tier FROM seats WHERE auditorium_id = $1;`, [
          aud.id,
        ]);

        for (const seat of seatsRes.rows) {
          let tierPremium = 0;
          if (seat.tier === 'VIP') tierPremium = 600; // +$6.00
          else if (seat.tier === 'PREMIUM') tierPremium = 300; // +$3.00

          const finalPrice = movie.basePrice + tierPremium;

          await db.query(
            `INSERT INTO showtime_seats (showtime_id, seat_id, status, price_cents)
             VALUES ($1, $2, 'AVAILABLE', $3)
             ON CONFLICT (showtime_id, seat_id) DO NOTHING;`,
            [showtimeId, seat.id, finalPrice]
          );
        }
      }

      if (!sampleShowtimeIdForBooking) {
        sampleShowtimeIdForBooking = showtimeId;
      }
    }
  }
  console.log(`⏰ Seeded showtimes and initialized real-time seat inventories`);

  // 7. Seed Sample Confirmed Booking & Ticket for Demo User
  if (sampleShowtimeIdForBooking) {
    const seatsToBook = await db.query(
      `SELECT ss.id as showtime_seat_id, s.id as seat_id, s.row, s.number, s.tier, ss.price_cents
       FROM showtime_seats ss
       JOIN seats s ON s.id = ss.seat_id
       WHERE ss.showtime_id = $1 AND ss.status = 'AVAILABLE' AND s.tier = 'VIP'
       LIMIT 2;`,
      [sampleShowtimeIdForBooking]
    );

    if (seatsToBook.rows.length === 2) {
      const s1 = seatsToBook.rows[0];
      const s2 = seatsToBook.rows[1];
      const subtotal = s1.price_cents + s2.price_cents;
      const fee = 300; // $3.00
      const tax = Math.round(subtotal * 0.08); // 8%
      const total = subtotal + fee + tax;
      const ref = 'CNB-7892-DEMO';

      const bookingRes = await db.query(
        `INSERT INTO bookings (reference, user_id, showtime_id, status, subtotal_cents, fee_cents, tax_cents, total_cents, expires_at)
         VALUES ($1, $2, $3, 'CONFIRMED', $4, $5, $6, $7, NOW() + INTERVAL '3 days')
         ON CONFLICT (reference) DO NOTHING
         RETURNING id;`,
        [ref, userId, sampleShowtimeIdForBooking, subtotal, fee, tax, total]
      );

      if (bookingRes.rows.length > 0) {
        const bId = bookingRes.rows[0].id;

        // Update seats to BOOKED
        for (const s of [s1, s2]) {
          await db.query(
            `UPDATE showtime_seats SET status = 'BOOKED', booking_id = $1 WHERE id = $2;`,
            [bId, s.showtime_seat_id]
          );

          await db.query(
            `INSERT INTO booking_items (booking_id, showtime_seat_id, seat_id, seat_row, seat_number, seat_tier, price_cents)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING;`,
            [bId, s.showtime_seat_id, s.seat_id, s.row, s.number, s.tier, s.price_cents]
          );
        }

        // Insert Payment record
        await db.query(
          `INSERT INTO payments (booking_id, idempotency_key, provider, transaction_ref, amount_cents, status)
           VALUES ($1, $2, 'STRIPE_TEST', $3, $4, 'SUCCEEDED')
           ON CONFLICT (idempotency_key) DO NOTHING;`,
          [bId, 'idem_demo_init_001', 'ch_test_3O4P5Q6R7S8T9U', total]
        );

        // Insert Digital Ticket with QR code data
        const ticketNum = 'TCK-2026-0001';
        const qrPayload = JSON.stringify({
          ticket: ticketNum,
          ref: ref,
          user: 'Alex Mercer',
          seats: `${s1.row}${s1.number}, ${s2.row}${s2.number}`,
          showtimeId: sampleShowtimeIdForBooking,
        });

        await db.query(
          `INSERT INTO tickets (booking_id, ticket_number, qr_code_data)
           VALUES ($1, $2, $3)
           ON CONFLICT (ticket_number) DO NOTHING;`,
          [bId, ticketNum, qrPayload]
        );

        // Insert audit log
        await db.query(
          `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, metadata)
           VALUES ('BOOKING', $1, 'BOOKING_CONFIRMED', $2, $3::jsonb);`,
          [bId, userId, JSON.stringify({ seats: [s1.seat_id, s2.seat_id], total_cents: total })]
        );

        console.log(`🎟️ Pre-seeded sample confirmed booking (${ref}) with digital ticket`);
      }
    }
  }

  console.log('✅ CineBook database seeding complete!');
}

if (process.argv[1] && process.argv[1].includes('seed')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
