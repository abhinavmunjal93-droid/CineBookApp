'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Star, Clock, MapPin, Calendar, Film, Sparkles, ChevronLeft, Ticket, AlertCircle } from 'lucide-react';

interface Showtime {
  id: string;
  movie_id: string;
  auditorium_id: string;
  start_time: string;
  end_time: string;
  base_price_cents: number;
  format: string;
  status: string;
  auditorium_name: string;
  screen_type: string;
  total_seats: number;
  cinema_id: string;
  cinema_name: string;
  cinema_city: string;
  cinema_address: string;
  available_seats: number;
}

interface MovieDetails {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  poster_url: string;
  backdrop_url: string;
  trailer_url?: string;
  duration_mins: number;
  release_date: string;
  age_rating: string;
  language: string;
  rating_score: number;
  status: string;
  genres: { id: string; name: string; slug: string }[];
}

export default function MovieDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const movieId = resolvedParams.id;

  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected date filter
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    fetch(`/api/movies/${movieId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Movie not found');
        return res.json();
      })
      .then((data) => {
        setMovie(data.movie);
        setShowtimes(data.showtimes || []);
        // Set default date to today or earliest showtime date
        if (data.showtimes && data.showtimes.length > 0) {
          const firstDate = data.showtimes[0].start_time.split('T')[0];
          setSelectedDate(firstDate);
        } else {
          setSelectedDate(new Date().toISOString().split('T')[0]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [movieId]);

  if (loading) {
    return (
      <div style={{ padding: '120px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', fontSize: '1rem' }}>Loading movie experience...</p>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
          <AlertCircle size={48} color="#f87171" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: 'white', marginBottom: '8px' }}>Movie Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            The requested movie could not be located in our active repertoire.
          </p>
          <Link href="/" className="btn btn-primary">
            Return to Movies
          </Link>
        </div>
      </div>
    );
  }

  // Generate unique available dates from showtimes
  const uniqueDates = Array.from(new Set(showtimes.map((st) => st.start_time.split('T')[0]))).sort();

  // If no showtimes have dates, provide today and tomorrow
  const displayDates = uniqueDates.length > 0 ? uniqueDates : [new Date().toISOString().split('T')[0]];

  // Filter showtimes for the selected date
  const filteredShowtimes = showtimes.filter((st) => st.start_time.startsWith(selectedDate));

  // Group filtered showtimes by cinema
  const cinemaGroups = new Map<string, { cinema: { id: string; name: string; city: string; address: string }; showtimes: Showtime[] }>();

  for (const st of filteredShowtimes) {
    if (!cinemaGroups.has(st.cinema_id)) {
      cinemaGroups.set(st.cinema_id, {
        cinema: { id: st.cinema_id, name: st.cinema_name, city: st.cinema_city, address: st.cinema_address },
        showtimes: [],
      });
    }
    cinemaGroups.get(st.cinema_id)!.showtimes.push(st);
  }

  const formatBadgeClass = (fmt: string) => {
    switch (fmt) {
      case 'IMAX_3D': return 'badge-gold';
      case 'DOLBY_CINEMA': return 'badge-cyan';
      case '4DX': return 'badge-purple';
      default: return 'badge-green';
    }
  };

  const formatLabel = (fmt: string) => {
    switch (fmt) {
      case 'IMAX_3D': return 'IMAX 3D Laser';
      case 'DOLBY_CINEMA': return 'Dolby Cinema Atmos';
      case '4DX': return '4DX Motion Dynamic';
      default: return 'Standard Digital';
    }
  };

  return (
    <div>
      {/* 1. Backdrop Banner Header */}
      <div style={{
        position: 'relative',
        minHeight: '440px',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${movie.backdrop_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          filter: 'brightness(0.35)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(7, 8, 12, 0.2) 0%, #07080c 100%)',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 2, paddingTop: '30px', paddingBottom: '30px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', transition: 'color 0.2s' }}>
            <ChevronLeft size={18} /> Back to Movies
          </Link>

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '36px',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}>
            {/* Poster Card */}
            <div style={{
              width: '240px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              flexShrink: 0,
            }}>
              <img
                src={movie.poster_url}
                alt={movie.title}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            {/* Info details */}
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'white' }}>
                  {movie.age_rating}
                </span>
                {movie.genres.map((g) => (
                  <span key={g.id} className="badge badge-gold">
                    {g.name}
                  </span>
                ))}
              </div>

              <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'white', marginBottom: '14px', lineHeight: 1.2 }}>
                {movie.title}
              </h1>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '16px',
                fontSize: '0.95rem',
                color: 'var(--text-secondary)',
                marginBottom: '20px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: 700 }}>
                  <Star size={18} fill="#fbbf24" strokeWidth={0} />
                  {movie.rating_score} / 5.0
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} />
                  {Math.floor(movie.duration_mins / 60)}h {movie.duration_mins % 60}m
                </span>
                <span>•</span>
                <span>{movie.language}</span>
                <span>•</span>
                <span>Released {new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>

              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#cbd5e1', maxWidth: '750px', marginBottom: '24px' }}>
                {movie.synopsis}
              </p>

              {movie.trailer_url && (
                <a
                  href={movie.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Film size={18} />
                  Watch Official Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Showtimes & Booking Section */}
      <section style={{ padding: '50px 0 80px' }}>
        <div className="container">
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '8px' }}>
              Select Showtime & Experience
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Choose a date and auditorium to reserve your seats with real-time seat lock.
            </p>
          </div>

          {/* Date Selector Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '16px',
            marginBottom: '36px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            {displayDates.map((dateStr) => {
              const d = new Date(dateStr + 'T00:00:00');
              const isSelected = selectedDate === dateStr;
              const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
              const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    padding: '12px 22px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    backgroundColor: isSelected ? 'var(--accent-gold)' : 'rgba(15, 18, 28, 0.7)',
                    borderColor: isSelected ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.1)',
                    color: isSelected ? '#07080c' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    minWidth: '100px',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 16px rgba(245, 158, 11, 0.3)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, opacity: isSelected ? 0.9 : 0.6 }}>
                    {weekday}
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 800 }}>
                    {monthDay}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Showtimes Grouped By Cinema */}
          {cinemaGroups.size === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Calendar size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h3 style={{ color: 'white', marginBottom: '6px' }}>No showtimes for this date</h3>
              <p style={{ fontSize: '0.9rem' }}>Please select another date from the calendar above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {Array.from(cinemaGroups.values()).map(({ cinema, showtimes }) => (
                <div key={cinema.id} className="glass-panel" style={{ padding: '28px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  {/* Cinema Header */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div>
                      <h3 style={{ fontSize: '1.3rem', color: 'white', marginBottom: '4px' }}>
                        {cinema.name}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} />
                        {cinema.address}, {cinema.city}
                      </div>
                    </div>
                    <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)' }}>
                      {showtimes.length} {showtimes.length === 1 ? 'Showtime' : 'Showtimes'} Available
                    </span>
                  </div>

                  {/* Showtimes Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '16px',
                  }}>
                    {showtimes.map((st) => {
                      const timeStr = new Date(st.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });
                      const priceDollars = (st.base_price_cents / 100).toFixed(2);
                      const isLowSeats = st.available_seats <= 15;

                      return (
                        <Link
                          key={st.id}
                          href={`/booking/${st.id}/seats`}
                          className="glass-card"
                          style={{
                            padding: '18px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            textDecoration: 'none',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div>
                            {/* Format Badge & Time */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <span className={`badge ${formatBadgeClass(st.format)}`}>
                                {formatLabel(st.format)}
                              </span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-gold)' }}>
                                ${priceDollars}
                              </span>
                            </div>

                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
                              {timeStr}
                            </div>

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                              {st.auditorium_name}
                            </div>
                          </div>

                          {/* Seat status badge & action */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '12px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          }}>
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: isLowSeats ? '#f87171' : '#4ade80',
                            }}>
                              {st.available_seats} seats left
                            </span>

                            <span style={{
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              color: 'var(--accent-gold)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              Select Seats →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
