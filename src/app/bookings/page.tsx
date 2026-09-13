'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Ticket, Calendar, Clock, MapPin, AlertCircle, CheckCircle2, XCircle, RefreshCw, ChevronRight } from 'lucide-react';

interface BookingItem {
  id: string;
  reference: string;
  user_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
  subtotal_cents: number;
  fee_cents: number;
  tax_cents: number;
  total_cents: number;
  created_at: string;
  movie_title: string;
  movie_poster_url: string;
  duration_mins: number;
  age_rating: string;
  showtime_id: string;
  start_time: string;
  format: string;
  auditorium_name: string;
  cinema_name: string;
  cinema_address: string;
  seat_labels: string;
  ticket_number?: string;
  is_eligible_for_cancel: boolean;
}

export default function BookingsHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingItem | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.status === 401) {
        router.push('/login?redirect=/bookings');
        return;
      }
      const data = await res.json();
      if (data.bookings) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/bookings');
      } else {
        fetchBookings();
      }
    }
  }, [user, authLoading, router]);

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    const bId = cancelModalBooking.id;
    setCancellingId(bId);
    setActionMessage(null);

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      setActionMessage({
        type: 'success',
        text: `Booking ${cancelModalBooking.reference} cancelled successfully. Your refund of $${(cancelModalBooking.total_cents / 100).toFixed(2)} has been processed and seats released.`,
      });

      setCancelModalBooking(null);
      fetchBookings();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Error cancelling booking. Please try again.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="badge badge-green">Confirmed</span>;
      case 'PENDING':
        return <span className="badge badge-gold">Pending Hold</span>;
      case 'REFUNDED':
        return <span className="badge badge-purple">Refunded</span>;
      case 'CANCELLED':
        return <span className="badge badge-red">Cancelled</span>;
      case 'EXPIRED':
        return <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>Expired</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <span className="badge badge-gold" style={{ marginBottom: '10px' }}>
            My Account
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'white', marginBottom: '8px' }}>
            Reservation History
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Manage your cinema tickets, verify upcoming showtimes, or initiate cancellations.
          </p>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: actionMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: actionMessage.type === 'success' ? '#4ade80' : '#fca5a5',
            fontSize: '0.92rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {actionMessage.text}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '14px', fontSize: '0.95rem' }}>Loading your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Ticket size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ color: 'white', marginBottom: '8px' }}>No reservations yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '400px', margin: '0 auto 24px' }}>
              You have not booked any cinema tickets yet. Explore current movies and reserve your favorite seats!
            </p>
            <Link href="/" className="btn btn-primary">
              Browse Movies Now
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {bookings.map((b) => {
              const showtimeDate = new Date(b.start_time).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const showtimeTime = new Date(b.start_time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <div
                  key={b.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Left: Movie poster & details */}
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <img
                      src={b.movie_poster_url}
                      alt={b.movie_title}
                      style={{ width: '70px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        {getStatusBadge(b.status)}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          Ref: {b.reference}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '4px' }}>
                        {b.movie_title}
                      </h3>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {b.cinema_name} • {b.auditorium_name} ({b.format.replace('_', ' ')})
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-gold)', fontWeight: 600 }}>
                        {showtimeDate} at {showtimeTime} • Seats: {b.seat_labels || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount and Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white' }}>
                      ${(b.total_cents / 100).toFixed(2)}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {b.status === 'CONFIRMED' && (
                        <Link
                          href={`/booking/${b.id}/ticket`}
                          className="btn btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          <Ticket size={16} />
                          View Ticket & QR
                        </Link>
                      )}

                      {b.status === 'PENDING' && (
                        <Link
                          href={`/booking/${b.id}/checkout`}
                          className="btn btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          Complete Checkout
                        </Link>
                      )}

                      {b.is_eligible_for_cancel && (
                        <button
                          type="button"
                          onClick={() => setCancelModalBooking(b)}
                          className="btn btn-outline"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {cancelModalBooking && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}>
            <div className="glass-panel" style={{
              backgroundColor: '#0e1017',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <AlertCircle size={26} />
              </div>

              <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '8px' }}>
                Cancel Reservation?
              </h2>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
                Are you sure you want to cancel your booking for <strong>{cancelModalBooking.movie_title}</strong> (Ref: <code>{cancelModalBooking.reference}</code>)?
              </p>

              <div style={{
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginBottom: '24px',
                lineHeight: 1.5,
              }}>
                • Full refund of <strong>${(cancelModalBooking.total_cents / 100).toFixed(2)}</strong> will be credited to your payment method.<br />
                • Seats <strong>{cancelModalBooking.seat_labels}</strong> will be instantly released back to available inventory.
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  disabled={cancellingId !== null}
                  className="btn btn-outline"
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancellingId !== null}
                  className="btn btn-danger"
                >
                  {cancellingId ? 'Cancelling & Releasing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
