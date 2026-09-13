'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Film, Calendar, MapPin, Star, Clock, Sparkles, Play, Ticket, ChevronRight } from 'lucide-react';

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface Movie {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  poster_url: string;
  backdrop_url: string;
  duration_mins: number;
  release_date: string;
  age_rating: string;
  language: string;
  rating_score: number;
  status: 'NOW_SHOWING' | 'COMING_SOON';
  genres: Genre[];
  showtimes_count: number;
}

interface Cinema {
  id: string;
  name: string;
  city: string;
}

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedCinema, setSelectedCinema] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'NOW_SHOWING' | 'COMING_SOON'>('NOW_SHOWING');

  useEffect(() => {
    // Fetch cinemas for filter dropdown
    fetch('/api/cinemas')
      .then((res) => res.json())
      .then((data) => {
        if (data.cinemas) setCinemas(data.cinemas);
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedGenre) params.append('genre', selectedGenre);
      if (selectedLanguage) params.append('language', selectedLanguage);
      if (selectedCinema) params.append('cinema', selectedCinema);
      if (selectedDate) params.append('date', selectedDate);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/movies?${params.toString()}`);
      const data = await res.json();
      if (data.movies) {
        setMovies(data.movies);
      }
    } catch (err) {
      console.error('Failed to load movies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [searchQuery, selectedGenre, selectedLanguage, selectedCinema, selectedDate, statusFilter]);

  const featuredMovie = movies.find((m) => m.slug === 'dune-part-two') || movies[0];

  // Helper date tabs for next 4 days
  const dateTabs = Array.from({ length: 4 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    const ymd = d.toISOString().split('T')[0];
    const label = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { ymd, label };
  });

  return (
    <div>
      {/* 1. Cinematic Hero Section */}
      {featuredMovie && (
        <section style={{
          position: 'relative',
          minHeight: '620px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          {/* Backdrop Image with Multi-Gradient Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${featuredMovie.backdrop_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 25%',
            filter: 'brightness(0.55)',
            transform: 'scale(1.03)',
            transition: 'transform 8s ease',
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(7, 8, 12, 0.2) 0%, rgba(7, 8, 12, 0.8) 70%, #07080c 100%), linear-gradient(90deg, #07080c 0%, rgba(7, 8, 12, 0.8) 40%, transparent 80%)',
          }} />

          {/* Hero Content */}
          <div className="container" style={{ position: 'relative', zIndex: 2, paddingTop: '40px', paddingBottom: '40px' }}>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} /> Spotlight Feature
                </span>
                <span className="badge badge-cyan">
                  IMAX Laser 3D
                </span>
                <span className="badge badge-purple">
                  Dolby Atmos
                </span>
              </div>

              <h1 style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 1.1,
                color: 'white',
                marginBottom: '18px',
                textShadow: '0 4px 20px rgba(0,0,0,0.8)',
              }}>
                {featuredMovie.title}
              </h1>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '16px',
                fontSize: '0.92rem',
                color: 'var(--text-secondary)',
                marginBottom: '20px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: 700 }}>
                  <Star size={16} fill="#fbbf24" strokeWidth={0} />
                  {featuredMovie.rating_score} / 5.0
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={16} />
                  {Math.floor(featuredMovie.duration_mins / 60)}h {featuredMovie.duration_mins % 60}m
                </span>
                <span>•</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'white',
                }}>
                  {featuredMovie.age_rating}
                </span>
                <span>•</span>
                <span>{featuredMovie.language}</span>
              </div>

              <p style={{
                fontSize: '1rem',
                lineHeight: 1.6,
                color: '#cbd5e1',
                marginBottom: '32px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {featuredMovie.synopsis}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                <Link
                  href={`/movies/${featuredMovie.id}`}
                  className="btn btn-primary"
                  style={{ padding: '14px 30px', fontSize: '1.05rem', borderRadius: 'var(--radius-sm)' }}
                >
                  <Ticket size={20} />
                  Book Tickets Now
                </Link>
                <Link
                  href={`/movies/${featuredMovie.id}`}
                  className="btn btn-outline"
                  style={{ padding: '14px 24px', fontSize: '1rem' }}
                >
                  View Showtimes
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Interactive Search & Filter Bar */}
      <section style={{ position: 'relative', zIndex: 10, marginTop: '-40px' }}>
        <div className="container">
          <div className="glass-panel" style={{
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}>
            {/* Top row: search & dropdowns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginBottom: '18px',
            }}>
              {/* Search Title */}
              <div style={{ position: 'relative' }}>
                <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type="text"
                  placeholder="Search movie title..."
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Genre filter */}
              <select
                className="select-field"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
              >
                <option value="">All Genres</option>
                <option value="sci-fi">Sci-Fi</option>
                <option value="action">Action</option>
                <option value="drama">Drama</option>
                <option value="adventure">Adventure</option>
                <option value="animation">Animation</option>
                <option value="biography">Biography</option>
                <option value="crime">Crime</option>
              </select>

              {/* Language filter */}
              <select
                className="select-field"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="">All Languages</option>
                <option value="English">English</option>
                <option value="Japanese">Japanese</option>
              </select>

              {/* Cinema location filter */}
              <select
                className="select-field"
                value={selectedCinema}
                onChange={(e) => setSelectedCinema(e.target.value)}
              >
                <option value="">All Cinemas</option>
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Bottom row: Date tabs & Status Switcher */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              {/* Date Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                  <Calendar size={14} /> Date:
                </span>
                <button
                  onClick={() => setSelectedDate('')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: selectedDate === '' ? 'var(--accent-gold)' : 'transparent',
                    borderColor: selectedDate === '' ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.1)',
                    color: selectedDate === '' ? '#07080c' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                  }}
                >
                  Any Date
                </button>
                {dateTabs.map((tab) => {
                  const active = selectedDate === tab.ymd;
                  return (
                    <button
                      key={tab.ymd}
                      onClick={() => setSelectedDate(tab.ymd)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        backgroundColor: active ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.04)',
                        borderColor: active ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.1)',
                        color: active ? '#07080c' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Status Switcher (Now Showing vs Coming Soon) */}
              <div style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '4px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                <button
                  onClick={() => setStatusFilter('NOW_SHOWING')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: statusFilter === 'NOW_SHOWING' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    color: statusFilter === 'NOW_SHOWING' ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  Now Showing
                </button>
                <button
                  onClick={() => setStatusFilter('COMING_SOON')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: statusFilter === 'COMING_SOON' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    color: statusFilter === 'COMING_SOON' ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Movie Catalog Grid */}
      <section style={{ padding: '60px 0 30px' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '6px' }}>
                {statusFilter === 'NOW_SHOWING' ? 'Movies in Theaters' : 'Anticipated Upcoming Releases'}
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {movies.length} {movies.length === 1 ? 'title' : 'titles'} matching your criteria
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '14px', fontSize: '0.9rem' }}>Loading cinematic roster...</p>
            </div>
          ) : movies.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Film size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No movies found</h3>
              <p style={{ fontSize: '0.92rem', maxWidth: '400px', margin: '0 auto 20px' }}>
                Try adjusting your search terms, genre filter, or cinema selection.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenre('');
                  setSelectedLanguage('');
                  setSelectedCinema('');
                  setSelectedDate('');
                }}
                className="btn btn-outline"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid-responsive-movies">
              {movies.map((movie) => (
                <div key={movie.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Poster Thumbnail */}
                  <Link href={`/movies/${movie.id}`} style={{ position: 'relative', width: '100%', aspectRatio: '2 / 3', overflow: 'hidden', display: 'block' }}>
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                    />

                    {/* Age Rating Pill */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', color: 'white', backdropFilter: 'blur(8px)' }}>
                        {movie.age_rating}
                      </span>
                    </div>

                    {/* Rating Pill */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <span className="badge badge-gold" style={{ display: 'flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(8px)' }}>
                        <Star size={12} fill="#fbbf24" strokeWidth={0} />
                        {movie.rating_score}
                      </span>
                    </div>

                    {/* Showtimes Pill */}
                    {movie.status === 'NOW_SHOWING' && (
                      <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
                        <span className="badge badge-cyan" style={{ backdropFilter: 'blur(8px)' }}>
                          {movie.showtimes_count} Showtimes
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Card Content */}
                  <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* Genres */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {movie.genres?.slice(0, 2).map((g) => (
                          <span key={g.id} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                            {g.name}
                          </span>
                        ))}
                      </div>

                      {/* Title */}
                      <Link href={`/movies/${movie.id}`}>
                        <h3 style={{
                          fontSize: '1.15rem',
                          color: 'var(--text-primary)',
                          marginBottom: '8px',
                          lineHeight: 1.3,
                          transition: 'color 0.2s',
                        }}>
                          {movie.title}
                        </h3>
                      </Link>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span>{Math.floor(movie.duration_mins / 60)}h {movie.duration_mins % 60}m</span>
                        <span>•</span>
                        <span>{movie.language}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link
                      href={`/movies/${movie.id}`}
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.9rem', padding: '10px' }}
                    >
                      <Ticket size={16} />
                      {movie.status === 'NOW_SHOWING' ? 'Select Showtimes' : 'View Details'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Experience Features Section */}
      <section style={{ padding: '60px 0', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 40px' }}>
            <span className="badge badge-gold" style={{ marginBottom: '10px' }}>
              Why CineBook
            </span>
            <h2 style={{ fontSize: '2rem', color: 'white', marginBottom: '12px' }}>
              Engineered For The Ultimate Cinema Night
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              From atomic seat holds with zero race conditions to instant boarding passes with scannable QR tickets.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            <div className="glass-panel" style={{ padding: '30px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Ticket size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '8px' }}>
                Atomic Seat Reservation
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Every seat selection is locked at the database row level with PostgreSQL transactions. You get a guaranteed 10-minute hold with zero double bookings.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '30px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Sparkles size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '8px' }}>
                Digital Boarding Pass & QR
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Instant confirmation generates a high-contrast digital ticket with verifiable QR codes for swift usher check-in at the cinema gate.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '30px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Film size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '8px' }}>
                VIP Recliners & Premium Formats
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Experience dual-laser IMAX 3D, Dolby Atmos, and motorized heated recliners with in-seat food & drink delivery at our luxury complexes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
