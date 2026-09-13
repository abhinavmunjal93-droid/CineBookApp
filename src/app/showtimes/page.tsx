'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Film, MapPin, Clock, Ticket, Sparkles } from 'lucide-react';

interface Movie {
  id: string;
  title: string;
  age_rating: string;
  poster_url: string;
  duration_mins: number;
}

export default function ShowtimesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetch(`/api/movies?status=NOW_SHOWING`)
      .then((res) => res.json())
      .then((data) => {
        if (data.movies) setMovies(data.movies);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const dateOptions = Array.from({ length: 5 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    const ymd = d.toISOString().split('T')[0];
    const label = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { ymd, label };
  });

  return (
    <div className="container" style={{ padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: '650px', marginBottom: '36px' }}>
        <span className="badge badge-gold" style={{ marginBottom: '12px' }}>
          Schedule
        </span>
        <h1 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '10px' }}>
          Daily Showtimes
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
          Explore screening schedules and reserve your seats ahead of time.
        </p>
      </div>

      {/* Date Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        overflowX: 'auto',
        paddingBottom: '16px',
        marginBottom: '36px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        {dateOptions.map((opt) => {
          const active = selectedDate === opt.ymd;
          return (
            <button
              key={opt.ymd}
              onClick={() => setSelectedDate(opt.ymd)}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                backgroundColor: active ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: active ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.1)',
                color: active ? '#07080c' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Loading showtimes roster...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {movies.map((m) => (
            <div
              key={m.id}
              className="glass-panel"
              style={{
                padding: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '24px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <img
                  src={m.poster_url}
                  alt={m.title}
                  style={{ width: '70px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                      {m.age_rating}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {Math.floor(m.duration_mins / 60)}h {m.duration_mins % 60}m
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.3rem', color: 'white', marginBottom: '6px' }}>
                    {m.title}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Multiple showtimes available across IMAX 3D & Dolby Cinema
                  </div>
                </div>
              </div>

              <Link
                href={`/movies/${m.id}`}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Ticket size={18} />
                View & Book Showtimes
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
