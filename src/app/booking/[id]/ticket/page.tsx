'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { CheckCircle2, Ticket, Printer, Share2, ArrowRight, Calendar, MapPin, Film, Sparkles, Clock, AlertCircle } from 'lucide-react';

interface BookingTicketData {
  id: string;
  reference: string;
  user_id: string;
  status: string;
  total_cents: number;
  movie_title: string;
  movie_poster_url: string;
  duration_mins: number;
  age_rating: string;
  start_time: string;
  format: string;
  auditorium_name: string;
  cinema_name: string;
  cinema_address: string;
  seat_labels: string;
  tickets: { id: string; ticket_number: string; qr_code_data: string; issued_at: string }[];
}

export default function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;
  const router = useRouter();

  const [booking, setBooking] = useState<BookingTicketData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Ticket not found');
        return res.json();
      })
      .then(async (data) => {
        if (data.booking) {
          setBooking(data.booking);

          // Generate QR code image from ticket data
          const ticketObj = data.booking.tickets?.[0];
          const qrPayload = ticketObj?.qr_code_data || JSON.stringify({
            ref: data.booking.reference,
            movie: data.booking.movie_title,
            seats: data.booking.seat_labels,
          });

          try {
            const url = await QRCode.toDataURL(qrPayload, {
              width: 280,
              margin: 2,
              color: {
                dark: '#07080c',
                light: '#ffffff',
              },
            });
            setQrDataUrl(url);
          } catch (qrErr) {
            console.error('Error generating QR code:', qrErr);
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div style={{ padding: '120px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', fontSize: '0.95rem' }}>Generating digital cinema pass...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '480px', margin: '0 auto' }}>
          <AlertCircle size={44} color="#f87171" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ color: 'white', marginBottom: '8px' }}>Ticket Not Available</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            {error || 'Unable to retrieve ticket details.'}
          </p>
          <Link href="/" className="btn btn-primary">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const primaryTicket = booking.tickets?.[0];
  const showtimeDateFormatted = new Date(booking.start_time).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const showtimeTimeFormatted = new Date(booking.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div style={{ padding: '40px 0 90px' }}>
      <div className="container" style={{ maxWidth: '780px' }}>
        {/* Success header message */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h1 style={{ fontSize: '2rem', color: 'white', marginBottom: '6px' }}>
            Booking Confirmed!
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Your seats have been booked. Present this digital ticket at the theater usher entrance.
          </p>
        </div>

        {/* Boarding Pass Cinema Ticket */}
        <div className="ticket-card" style={{ marginBottom: '32px' }}>
          <div className="ticket-notch-left" />
          <div className="ticket-notch-right" />
          <div className="ticket-divider-dashed" />

          {/* Top Section: Movie & Showtime */}
          <div style={{ padding: '36px 36px 48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-gold">
                  {booking.format.replace('_', ' ')}
                </span>
                <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }}>
                  {booking.age_rating}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                  Booking Reference
                </span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-gold)', fontFamily: 'monospace' }}>
                  {booking.reference}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <img
                src={booking.movie_poster_url}
                alt={booking.movie_title}
                style={{ width: '95px', height: '140px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
              />
              <div style={{ flex: 1, minWidth: '240px' }}>
                <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '8px', lineHeight: 1.2 }}>
                  {booking.movie_title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  <MapPin size={16} color="var(--accent-gold)" />
                  {booking.cinema_name} • {booking.auditorium_name}
                </div>

                {/* Key metadata grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginTop: '2px' }}>{showtimeDateFormatted}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Showtime</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '2px' }}>{showtimeTimeFormatted}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Seats</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>{booking.seat_labels}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Verified Scannable QR Code & Usher Validation */}
          <div style={{
            padding: '36px',
            backgroundColor: 'rgba(5, 6, 9, 0.95)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                <CheckCircle2 size={16} /> Verified Active Admission
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.5, marginBottom: '12px' }}>
                Scan at the hall scanner kiosk or display to theater personnel upon entry.
              </div>
              {primaryTicket && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Ticket No: <code style={{ color: 'white' }}>{primaryTicket.ticket_number}</code>
                </div>
              )}
            </div>

            {/* QR Code Container */}
            {qrDataUrl && (
              <div style={{
                padding: '10px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src={qrDataUrl}
                  alt="Ticket QR Code"
                  style={{ width: '130px', height: '130px', display: 'block' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '0.95rem' }}
          >
            <Printer size={18} />
            Print Digital Ticket
          </button>

          <Link
            href="/bookings"
            className="btn btn-outline"
            style={{ padding: '12px 24px', fontSize: '0.95rem' }}
          >
            <Ticket size={18} />
            View All Reservations
          </Link>
        </div>
      </div>
    </div>
  );
}
