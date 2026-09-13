'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, Clock, ShieldCheck, Ticket, Info, Check, AlertCircle, Sparkles } from 'lucide-react';

interface SeatItem {
  seatId: string;
  showtimeSeatId: string;
  row: string;
  number: number;
  tier: 'REGULAR' | 'PREMIUM' | 'VIP' | 'ACCESSIBLE';
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED' | 'SELECTED_BY_ME';
  priceCents: number;
  holdExpiresAt?: string;
  isHeldByMe?: boolean;
}

interface SeatRow {
  row: string;
  seats: SeatItem[];
}

interface ShowtimeInfo {
  id: string;
  movie_id: string;
  movie_title: string;
  auditorium_name: string;
  screen_type: string;
  cinema_name: string;
  start_time: string;
  base_price_cents: number;
}

export default function SeatSelectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const showtimeId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const [showtime, setShowtime] = useState<ShowtimeInfo | null>(null);
  const [rows, setRows] = useState<SeatRow[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSeats = async () => {
    try {
      const res = await fetch(`/api/showtimes/${showtimeId}/seats`);
      if (!res.ok) throw new Error('Showtime not found');
      const data = await res.json();
      setShowtime(data.showtime);
      setRows(data.rows || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load seat layout');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeats();
    // Auto-refresh seat availability every 15 seconds to reflect other users' holds
    const interval = setInterval(loadSeats, 15000);
    return () => clearInterval(interval);
  }, [showtimeId]);

  // Handle seat click
  const handleToggleSeat = (seat: SeatItem) => {
    if (seat.status === 'BOOKED' || seat.status === 'BLOCKED') return;
    if (seat.status === 'HELD' && !seat.isHeldByMe) return;

    setErrorMessage('');
    const isSelected = selectedSeatIds.includes(seat.seatId);

    if (isSelected) {
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seat.seatId));
    } else {
      if (selectedSeatIds.length >= 8) {
        setErrorMessage('Maximum 8 seats can be selected per booking.');
        return;
      }
      setSelectedSeatIds([...selectedSeatIds, seat.seatId]);
    }
  };

  // Find all selected seat items for calculating totals
  const allSeats = rows.flatMap((r) => r.seats);
  const selectedSeatsList = allSeats.filter((s) => selectedSeatIds.includes(s.seatId));

  // Server pricing calculations in integer cents
  const subtotalCents = selectedSeatsList.reduce((sum, s) => sum + s.priceCents, 0);
  const feeCents = selectedSeatIds.length * 150; // $1.50 per seat
  const taxCents = Math.round(subtotalCents * 0.08); // 8% tax
  const totalCents = subtotalCents + feeCents + taxCents;

  const handleProceedToHold = async () => {
    if (selectedSeatIds.length === 0) {
      setErrorMessage('Please select at least one seat to continue.');
      return;
    }

    if (!user) {
      // Redirect to login with return path
      router.push(`/login?redirect=/booking/${showtimeId}/seats`);
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/bookings/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showtimeId,
          seatIds: selectedSeatIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to hold seats');
      }

      // Successfully held! Navigate to checkout
      router.push(`/booking/${data.bookingId}/checkout`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Seat reservation failed. Please try again.');
      // Refresh seat map to show updated real-time status
      loadSeats();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '120px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', fontSize: '0.95rem' }}>Loading auditorium seat map...</p>
      </div>
    );
  }

  if (!showtime) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '480px', margin: '0 auto' }}>
          <AlertCircle size={40} color="#f87171" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ color: 'white', marginBottom: '8px' }}>Showtime Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            {errorMessage || 'The requested showtime could not be loaded.'}
          </p>
          <Link href="/" className="btn btn-primary">
            Return to Movies
          </Link>
        </div>
      </div>
    );
  }

  const showtimeDateFormatted = new Date(showtime.start_time).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const showtimeTimeFormatted = new Date(showtime.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div style={{ padding: '30px 0 80px' }}>
      <div className="container">
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Link
            href={`/movies/${showtime.movie_id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', transition: 'color 0.2s' }}
          >
            <ChevronLeft size={18} /> Back to {showtime.movie_title}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} color="#4ade80" />
            Row-locked concurrency protection
          </div>
        </div>

        {/* Showtime Summary Header Banner */}
        <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '32px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-gold">{showtime.screen_type.replace('_', ' ')}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{showtime.cinema_name}</span>
              </div>
              <h1 style={{ fontSize: '1.6rem', color: 'white' }}>
                {showtime.movie_title}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>
                  {showtimeTimeFormatted}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {showtimeDateFormatted} • {showtime.auditorium_name}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.9rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <AlertCircle size={18} />
            {errorMessage}
          </div>
        )}

        {/* Main Seating Layout & Reservation Drawer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr minmax(320px, 380px)',
          gap: '32px',
          alignItems: 'start',
        }} className="seat-selection-grid">
          {/* Left: Auditorium Map */}
          <div className="glass-panel" style={{ padding: '36px 20px', overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {/* Curved Cinema Screen */}
            <div className="cinema-screen-container">
              <div className="cinema-screen-bar" />
              <div className="cinema-screen-text">
                CURVED CINEMA STAGE & SCREEN
              </div>
            </div>

            {/* Seat Grid Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', minWidth: '550px' }}>
              {rows.map((rowItem) => (
                <div key={rowItem.row} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Row Letter */}
                  <span style={{
                    width: '24px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}>
                    {rowItem.row}
                  </span>

                  {/* Row Seats */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {rowItem.seats.map((seat) => {
                      const isSelected = selectedSeatIds.includes(seat.seatId);
                      const isBooked = seat.status === 'BOOKED' || seat.status === 'BLOCKED';
                      const isHeld = seat.status === 'HELD' && !seat.isHeldByMe;

                      // Color by tier or state
                      let bgColor = '#334155';
                      let borderColor = '#475569';
                      let cursor = 'pointer';

                      if (isBooked) {
                        bgColor = '#161922';
                        borderColor = 'rgba(255, 255, 255, 0.04)';
                        cursor = 'not-allowed';
                      } else if (isHeld) {
                        bgColor = '#4338ca';
                        borderColor = '#6366f1';
                        cursor = 'not-allowed';
                      } else if (isSelected) {
                        bgColor = '#f59e0b';
                        borderColor = '#fbbf24';
                      } else if (seat.tier === 'VIP') {
                        bgColor = 'rgba(236, 72, 153, 0.18)';
                        borderColor = '#ec4899';
                      } else if (seat.tier === 'PREMIUM') {
                        bgColor = 'rgba(139, 92, 246, 0.18)';
                        borderColor = '#8b5cf6';
                      } else if (seat.tier === 'ACCESSIBLE') {
                        bgColor = 'rgba(6, 182, 212, 0.18)';
                        borderColor = '#06b6d4';
                      }

                      return (
                        <button
                          key={seat.seatId}
                          type="button"
                          onClick={() => handleToggleSeat(seat)}
                          disabled={isBooked || isHeld}
                          title={`Row ${seat.row} Seat ${seat.number} (${seat.tier}) - $${(seat.priceCents / 100).toFixed(2)}${isBooked ? ' [BOOKED]' : isHeld ? ' [HELD]' : ''}`}
                          style={{
                            width: '34px',
                            height: '32px',
                            borderRadius: seat.tier === 'VIP' ? '8px 8px 4px 4px' : '6px 6px 3px 3px',
                            backgroundColor: bgColor,
                            border: `1.5px solid ${borderColor}`,
                            color: isSelected ? '#07080c' : 'white',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                            boxShadow: isSelected ? '0 0 12px rgba(245, 158, 11, 0.6)' : 'none',
                          }}
                        >
                          {isSelected ? <Check size={14} strokeWidth={3} /> : seat.number}
                        </button>
                      );
                    })}
                  </div>

                  <span style={{
                    width: '24px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}>
                    {rowItem.row}
                  </span>
                </div>
              ))}
            </div>

            {/* Seating Map Legend */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#334155', border: '1px solid #475569' }} />
                <span>Regular</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: 'rgba(139, 92, 246, 0.25)', border: '1.5px solid #8b5cf6' }} />
                <span>Premium (+$3)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: 'rgba(236, 72, 153, 0.25)', border: '1.5px solid #ec4899' }} />
                <span>VIP Recliner (+$6)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#f59e0b', border: '1.5px solid #fbbf24' }} />
                <span>Selected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#161922', border: '1px solid rgba(255,255,255,0.06)' }} />
                <span>Booked</span>
              </div>
            </div>
          </div>

          {/* Right: Reservation & Price Drawer */}
          <div className="glass-panel" style={{
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            position: 'sticky',
            top: '90px',
          }}>
            <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Ticket size={18} color="var(--accent-gold)" />
              Booking Summary
            </h3>

            {/* Selected Seats Chips */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '8px' }}>
                Selected Seats ({selectedSeatsList.length})
              </div>

              {selectedSeatsList.length === 0 ? (
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}>
                  Please click on the seating map to select your seats.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedSeatsList.map((s) => (
                    <div
                      key={s.seatId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: 'white',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      <span>Row {s.row} - {s.number}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-gold)' }}>
                        ${(s.priceCents / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Breakdown in Integer Minor Units */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '18px 0',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '20px',
              fontSize: '0.9rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Tickets Subtotal</span>
                <span>${(subtotalCents / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Convenience Fee ($1.50/seat)</span>
                <span>${(feeCents / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Sales Tax (8%)</span>
                <span>${(taxCents / 100).toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'white',
              }}>
                <span>Total Due</span>
                <span style={{ color: 'var(--accent-gold)' }}>
                  ${(totalCents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* 10-Minute Hold Guarantee Callout */}
            <div style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              color: '#38bdf8',
              fontSize: '0.8rem',
              lineHeight: 1.5,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}>
              <Clock size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                Selected seats will be locked for <strong>10 minutes</strong> upon proceeding to checkout.
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={handleProceedToHold}
              disabled={selectedSeatIds.length === 0 || submitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              {submitting ? 'Locking Seats in Database...' : 'Proceed to Checkout →'}
            </button>

            {!user && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                You will be prompted to sign in before confirming your reservation.
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.seat-selection-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
