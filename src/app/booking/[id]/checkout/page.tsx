'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Clock, ShieldCheck, CreditCard, Lock, AlertCircle, CheckCircle2, ChevronLeft, Sparkles, RefreshCw } from 'lucide-react';

interface BookingDetail {
  id: string;
  reference: string;
  user_id: string;
  showtime_id: string;
  status: string;
  subtotal_cents: number;
  fee_cents: number;
  tax_cents: number;
  total_cents: number;
  expires_at: string;
  movie_title: string;
  movie_poster_url: string;
  duration_mins: number;
  age_rating: string;
  start_time: string;
  format: string;
  auditorium_name: string;
  cinema_name: string;
  cinema_address: string;
  seats: { seat_row: string; seat_number: number; seat_tier: string; price_cents: number }[];
  seat_labels: string;
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [simulateOutcome, setSimulateOutcome] = useState<'SUCCESS' | 'DECLINED'>('SUCCESS');

  // Idempotency key per checkout attempt
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // Countdown timer state
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(600);

  useEffect(() => {
    // Generate fresh idempotency key
    setIdempotencyKey(`idem_${bookingId.substring(0, 8)}_${Date.now()}`);

    fetch(`/api/bookings/${bookingId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Booking not found or expired');
        return res.json();
      })
      .then((data) => {
        if (data.booking) {
          setBooking(data.booking);

          // If already confirmed, navigate straight to ticket
          if (data.booking.status === 'CONFIRMED') {
            router.push(`/booking/${bookingId}/ticket`);
            return;
          }

          // Calculate remaining seconds
          const expiresMs = new Date(data.booking.expires_at).getTime();
          const diffSeconds = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
          setTimeLeftSeconds(diffSeconds);
        }
      })
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setLoading(false));
  }, [bookingId, router]);

  // Countdown effect
  useEffect(() => {
    if (timeLeftSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  const handlePay = async () => {
    if (timeLeftSeconds <= 0) {
      setErrorMessage('Your seat hold has expired. Please return to select seats again.');
      return;
    }

    setPaying(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/bookings/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          idempotencyKey,
          simulateOutcome,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      // Success! Navigate to digital boarding pass ticket
      router.push(`/booking/${bookingId}/ticket`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '120px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', fontSize: '0.95rem' }}>Loading checkout reservation...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
          <AlertCircle size={44} color="#f87171" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ color: 'white', marginBottom: '8px' }}>Booking Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {errorMessage || 'This booking could not be loaded.'}
          </p>
          <Link href="/" className="btn btn-primary">
            Return to Movies
          </Link>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const isExpired = timeLeftSeconds <= 0;

  const showtimeDateFormatted = new Date(booking.start_time).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const showtimeTimeFormatted = new Date(booking.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Navigation */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href={`/booking/${booking.showtime_id}/seats`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}
          >
            <ChevronLeft size={18} /> Modify Seats
          </Link>
        </div>

        {/* Hold Countdown Header Banner */}
        <div style={{
          padding: '16px 24px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} color={isExpired ? '#f87171' : '#fbbf24'} />
            <div>
              <span style={{ fontWeight: 700, color: isExpired ? '#f87171' : '#fbbf24', fontSize: '0.95rem' }}>
                {isExpired ? 'Seat Hold Expired' : 'Seats Temporarily Locked'}
              </span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {isExpired
                  ? 'Your 10-minute hold has elapsed. These seats may now be reserved by another guest.'
                  : 'Complete your payment before the timer expires to confirm your reservation.'}
              </p>
            </div>
          </div>

          <div style={{
            fontSize: '1.4rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            color: isExpired ? '#f87171' : 'var(--text-gold)',
            letterSpacing: '0.05em',
            padding: '4px 14px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderRadius: 'var(--radius-sm)',
          }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {/* Error notification */}
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

        {/* Checkout Columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          alignItems: 'start',
        }}>
          {/* Col 1: Order Details */}
          <div className="glass-panel" style={{ padding: '28px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h2 style={{ fontSize: '1.3rem', color: 'white', marginBottom: '20px' }}>
              Reservation Overview
            </h2>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
              <img
                src={booking.movie_poster_url}
                alt={booking.movie_title}
                style={{ width: '85px', height: '125px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
              />
              <div>
                <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
                  {booking.format.replace('_', ' ')}
                </span>
                <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '6px' }}>
                  {booking.movie_title}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {booking.cinema_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {showtimeDateFormatted} • {showtimeTimeFormatted} • {booking.auditorium_name}
                </div>
              </div>
            </div>

            {/* Allocated Seats */}
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '24px',
            }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px' }}>
                Confirmed Allocated Seats ({booking.seats.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {booking.seats.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: 'white',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    Row {s.seat_row} - {s.seat_number} ({s.seat_tier})
                  </span>
                ))}
              </div>
            </div>

            {/* Price Itemization */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal ({booking.seats.length} tickets)</span>
                <span>${(booking.subtotal_cents / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Convenience & Booking Fee</span>
                <span>${(booking.fee_cents / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>State & Local Tax (8%)</span>
                <span>${(booking.tax_cents / 100).toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'white',
              }}>
                <span>Total Amount Due</span>
                <span style={{ color: 'var(--accent-gold)' }}>
                  ${(booking.total_cents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Col 2: Payment Processing Form */}
          <div className="glass-panel" style={{ padding: '28px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.3rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="var(--accent-gold)" />
                Test Payment
              </h2>
              <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} /> Test Sandbox
              </span>
            </div>

            {/* Pre-filled Card Demo */}
            <div style={{
              background: 'linear-gradient(135deg, #1e2538, #0f1320)',
              borderRadius: 'var(--radius-sm)',
              padding: '18px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  CineBook Test Card
                </span>
                <Sparkles size={16} color="var(--accent-gold)" />
              </div>
              <div style={{ fontSize: '1.15rem', letterSpacing: '0.12em', color: 'white', fontFamily: 'monospace', marginBottom: '12px' }}>
                4242 •••• •••• 4242
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <span>EXP: 12/28</span>
                <span>CVC: 999</span>
                <span>IDEMPOTENT READY</span>
              </div>
            </div>

            {/* Simulation Options for QA verification */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                QA Simulation Mode:
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSimulateOutcome('SUCCESS')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    backgroundColor: simulateOutcome === 'SUCCESS' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                    borderColor: simulateOutcome === 'SUCCESS' ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
                    color: simulateOutcome === 'SUCCESS' ? '#4ade80' : 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Success Flow
                </button>
                <button
                  type="button"
                  onClick={() => setSimulateOutcome('DECLINED')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    backgroundColor: simulateOutcome === 'DECLINED' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                    borderColor: simulateOutcome === 'DECLINED' ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                    color: simulateOutcome === 'DECLINED' ? '#f87171' : 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Simulate Decline
                </button>
              </div>
            </div>

            {/* Idempotency Key Display */}
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '24px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Idempotency Key:</span>
                <span style={{ color: '#4ade80' }}>Active</span>
              </div>
              <code style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{idempotencyKey}</code>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handlePay}
              disabled={paying || isExpired}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1.05rem', marginBottom: '14px' }}
            >
              {paying ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={18} className="spin" /> Verifying & Issuing Ticket...
                </span>
              ) : (
                `Pay ${(booking.total_cents / 100).toFixed(2)} & Confirm Tickets`
              )}
            </button>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              By confirming, you authorize CineBook to verify seats and charge ${(booking.total_cents / 100).toFixed(2)}. Cancellations eligible up to showtime start.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
