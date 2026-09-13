'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Film, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';

interface Auditorium {
  id: string;
  name: string;
  screen_type: string;
  total_seats: number;
}

interface Cinema {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  amenities: string[];
  auditorium_count: number;
  upcoming_showtimes_count: number;
  auditoriums: Auditorium[];
}

export default function CinemasPage() {
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cinemas')
      .then((res) => res.json())
      .then((data) => {
        if (data.cinemas) setCinemas(data.cinemas);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container" style={{ padding: '40px 24px 80px' }}>
      {/* Header */}
      <div style={{ maxWidth: '650px', marginBottom: '40px' }}>
        <span className="badge badge-gold" style={{ marginBottom: '12px' }}>
          Our Theaters
        </span>
        <h1 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '12px' }}>
          Premier Cinema Locations
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Each CineBook complex features cutting-edge projection, immersive acoustic calibration, and handcrafted luxury seating.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '14px', fontSize: '0.92rem' }}>Locating cinema complexes...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {cinemas.map((cinema) => (
            <div
              key={cinema.id}
              className="glass-panel"
              style={{
                padding: '32px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '30px',
                alignItems: 'center',
              }}
            >
              {/* Cinema info col */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span className="badge badge-cyan">
                    {cinema.city}, {cinema.state}
                  </span>
                  <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'white' }}>
                    {cinema.auditorium_count} Screens
                  </span>
                </div>

                <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '12px' }}>
                  {cinema.name}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color="var(--accent-gold)" />
                    {cinema.address}, {cinema.city}, {cinema.state} {cinema.postal_code}
                  </div>
                  {cinema.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={16} color="var(--accent-cyan)" />
                      {cinema.phone}
                    </div>
                  )}
                </div>

                {/* Amenities */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px' }}>
                    Featured Amenities
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {cinema.amenities?.map((amenity, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 'var(--radius-full)',
                          padding: '4px 12px',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <CheckCircle2 size={12} color="#4ade80" />
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/?cinema=${cinema.id}`}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Film size={18} />
                  Browse Movies at This Cinema
                  <ChevronRight size={16} />
                </Link>
              </div>

              {/* Auditoriums Col */}
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}>
                <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--accent-gold)" />
                  Auditoriums & Sound Stages
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cinema.auditoriums?.map((aud) => (
                    <div
                      key={aud.id}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>
                          {aud.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Capacity: {aud.total_seats} reserved seats
                        </div>
                      </div>

                      <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                        {aud.screen_type.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
