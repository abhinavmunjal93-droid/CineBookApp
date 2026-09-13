'use client';

import React from 'react';
import Link from 'next/link';
import { Film, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      backgroundColor: '#050609',
      padding: '50px 0 30px',
      marginTop: '80px',
      position: 'relative',
      zIndex: 10,
    }}>
      <div className="container">
        {/* Cinema Tech Partners Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '30px',
          paddingBottom: '40px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          marginBottom: '40px',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>
            Certified Cinema Formats
          </span>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-gold" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              IMAX® Laser 4K
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              Dolby Cinema™ Atmos
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              4DX™ Sensory Motion
            </span>
            <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              VIP Luxury Recliners
            </span>
          </div>
        </div>

        {/* Links Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '36px',
          marginBottom: '40px',
        }}>
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b, #e11d48)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Film size={16} color="#07080c" />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'white' }}>
                CINEBOOK
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The premier cinema ticketing platform. Experience seamless atomic reservations, verified seat locks, and high-fidelity digital tickets.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '0.04em' }}>
              Explore
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <li><Link href="/" style={{ transition: 'color 0.2s' }}>Now Showing Movies</Link></li>
              <li><Link href="/cinemas">Cinema Complexes</Link></li>
              <li><Link href="/showtimes">Showtimes & Schedule</Link></li>
              <li><Link href="/bookings">My Reservations</Link></li>
            </ul>
          </div>

          {/* QA & Tester Quick Credentials */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
              <ShieldCheck size={16} />
              QA Test Credentials
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Admin:</strong> <code>admin@cinebook.com</code> / <code>AdminPassword123!</code>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Customer:</strong> <code>user@cinebook.com</code> / <code>UserPassword123!</code>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px' }}>
                Pre-seeded with active movies, showtimes, and VIP seating.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          <div>
            © {new Date().getFullYear()} CineBook Inc. All rights reserved. Concurrency & Neon PostgreSQL Engine.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>PCI-DSS Test Mode</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
