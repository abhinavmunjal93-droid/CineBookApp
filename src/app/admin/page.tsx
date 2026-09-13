'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Film,
  DollarSign,
  Ticket,
  Calendar,
  Users,
  Activity,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';

interface AdminStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenueCents: number;
  totalMovies: number;
  activeShowtimes: number;
  totalCustomers: number;
  totalScreens: number;
}

interface RecentBooking {
  id: string;
  reference: string;
  status: string;
  total_cents: number;
  created_at: string;
  customer_email: string;
  customer_name: string;
  movie_title: string;
  format: string;
  cinema_name: string;
}

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata: any;
  created_at: string;
  actor_email?: string;
  actor_name?: string;
}

export default function AdminPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'addMovie' | 'addShowtime' | 'audit'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [newMovie, setNewMovie] = useState({
    title: '',
    synopsis: '',
    posterUrl: '',
    backdropUrl: '',
    trailerUrl: '',
    durationMins: '120',
    releaseDate: new Date().toISOString().split('T')[0],
    ageRating: 'PG-13',
    language: 'English',
  });

  const [cinemasList, setCinemasList] = useState<any[]>([]);
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [newShowtime, setNewShowtime] = useState({
    movieId: '',
    auditoriumId: '',
    startTime: '',
    basePriceCents: '2000',
    format: 'IMAX_3D',
  });

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentBookings(data.recentBookings || []);
        setRecentAuditLogs(data.recentAuditLogs || []);
      }
    } catch (err) {
      console.error('Error loading admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === 'ADMIN') {
      fetchAdminData();
      // Fetch movies and cinemas for dropdowns
      fetch('/api/movies').then((r) => r.json()).then((d) => setMoviesList(d.movies || []));
      fetch('/api/cinemas').then((r) => r.json()).then((d) => setCinemasList(d.cinemas || []));
    }
  }, [user, authLoading]);

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    try {
      const res = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovie),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create movie');

      setNotification({ type: 'success', message: `Movie "${newMovie.title}" created successfully!` });
      setNewMovie({
        title: '',
        synopsis: '',
        posterUrl: '',
        backdropUrl: '',
        trailerUrl: '',
        durationMins: '120',
        releaseDate: new Date().toISOString().split('T')[0],
        ageRating: 'PG-13',
        language: 'English',
      });
      fetchAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleCreateShowtime = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    try {
      const res = await fetch('/api/admin/showtimes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShowtime),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule showtime');

      setNotification({ type: 'success', message: 'Showtime scheduled & seat inventory populated!' });
      fetchAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // If user is not admin, show clear sign in banner
  if (!authLoading && user?.role !== 'ADMIN') {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={28} />
          </div>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>Admin Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.6 }}>
            You must be signed in with an Administrator account to view operations, schedule showtimes, or inspect audit logs.
          </p>
          <button
            onClick={async () => {
              await login('admin@cinebook.com', 'AdminPassword123!');
            }}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            <Shield size={18} />
            Sign in as Demo Administrator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px 0 80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={12} /> System Console
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Connected to Neon PostgreSQL Engine</span>
            </div>
            <h1 style={{ fontSize: '2.2rem', color: 'white' }}>
              Operations Dashboard
            </h1>
          </div>

          {/* Navigation tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            gap: '4px',
          }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: activeTab === 'overview' ? 'var(--accent-purple)' : 'transparent',
                color: activeTab === 'overview' ? 'white' : 'var(--text-muted)',
              }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('addMovie')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: activeTab === 'addMovie' ? 'var(--accent-purple)' : 'transparent',
                color: activeTab === 'addMovie' ? 'white' : 'var(--text-muted)',
              }}
            >
              + Add Movie
            </button>
            <button
              onClick={() => setActiveTab('addShowtime')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: activeTab === 'addShowtime' ? 'var(--accent-purple)' : 'transparent',
                color: activeTab === 'addShowtime' ? 'white' : 'var(--text-muted)',
              }}
            >
              + Schedule Showtime
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: activeTab === 'audit' ? 'var(--accent-purple)' : 'transparent',
                color: activeTab === 'audit' ? 'white' : 'var(--text-muted)',
              }}
            >
              Audit Trail
            </button>
          </div>
        </div>

        {/* Notification Alert */}
        {notification && (
          <div style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: notification.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: notification.type === 'success' ? '#4ade80' : '#fca5a5',
            fontSize: '0.9rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {notification.message}
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && stats && (
          <div>
            {/* KPI Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
              marginBottom: '36px',
            }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Revenue</span>
                  <DollarSign size={20} color="#fbbf24" />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>
                  ${(stats.totalRevenueCents / 100).toFixed(2)}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '4px', display: 'block' }}>
                  Confirmed transactions
                </span>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Confirmed Bookings</span>
                  <Ticket size={20} color="#4ade80" />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>
                  {stats.confirmedBookings}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  {stats.totalBookings} total attempts
                </span>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Active Screenings</span>
                  <Calendar size={20} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>
                  {stats.activeShowtimes}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Across {stats.totalScreens} auditoriums
                </span>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Movie Catalog</span>
                  <Film size={20} color="#c084fc" />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>
                  {stats.totalMovies}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  {stats.totalCustomers} registered guests
                </span>
              </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--accent-gold)" />
                Recent System Bookings
              </h2>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 16px' }}>Reference</th>
                      <th style={{ padding: '12px 16px' }}>Movie & Format</th>
                      <th style={{ padding: '12px 16px' }}>Customer</th>
                      <th style={{ padding: '12px 16px' }}>Amount</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-gold)', fontWeight: 700 }}>
                          {b.reference}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'white' }}>
                          <div>{b.movie_title}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.cinema_name} ({b.format})</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          <div>{b.customer_name}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.customer_email}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'white', fontWeight: 700 }}>
                          ${(b.total_cents / 100).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${b.status === 'CONFIRMED' ? 'badge-green' : b.status === 'PENDING' ? 'badge-gold' : 'badge-red'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(b.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADD MOVIE */}
        {activeTab === 'addMovie' && (
          <div className="glass-panel" style={{ padding: '36px', maxWidth: '720px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '8px' }}>
              Add Movie to Theater Roster
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Configure film metadata, age ratings, and poster assets for immediate public scheduling.
            </p>

            <form onSubmit={handleCreateMovie} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  Movie Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gladiator II"
                  className="input-field"
                  value={newMovie.title}
                  onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  Synopsis
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detailed synopsis..."
                  className="input-field"
                  value={newMovie.synopsis}
                  onChange={(e) => setNewMovie({ ...newMovie, synopsis: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    Poster Image URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    className="input-field"
                    value={newMovie.posterUrl}
                    onChange={(e) => setNewMovie({ ...newMovie, posterUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    Backdrop Banner URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    className="input-field"
                    value={newMovie.backdropUrl}
                    onChange={(e) => setNewMovie({ ...newMovie, backdropUrl: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    required
                    className="input-field"
                    value={newMovie.durationMins}
                    onChange={(e) => setNewMovie({ ...newMovie, durationMins: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    Age Rating
                  </label>
                  <select
                    className="select-field"
                    value={newMovie.ageRating}
                    onChange={(e) => setNewMovie({ ...newMovie, ageRating: e.target.value })}
                  >
                    <option value="PG">PG</option>
                    <option value="PG-13">PG-13</option>
                    <option value="R">R</option>
                    <option value="NC-17">NC-17</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    Language
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newMovie.language}
                    onChange={(e) => setNewMovie({ ...newMovie, language: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '12px', fontSize: '1rem', marginTop: '10px' }}
              >
                Create & Publish Movie
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: SCHEDULE SHOWTIME */}
        {activeTab === 'addShowtime' && (
          <div className="glass-panel" style={{ padding: '36px', maxWidth: '720px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '8px' }}>
              Schedule Showtime & Populate Seat Inventory
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Select a film, auditorium screen, and screening time. Seat layout and pricing tiers are generated automatically.
            </p>

            <form onSubmit={handleCreateShowtime} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  Select Movie
                </label>
                <select
                  required
                  className="select-field"
                  value={newShowtime.movieId}
                  onChange={(e) => setNewShowtime({ ...newShowtime, movieId: e.target.value })}
                >
                  <option value="">-- Select a movie --</option>
                  {moviesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.age_rating})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  Select Auditorium / Screen
                </label>
                <select
                  required
                  className="select-field"
                  value={newShowtime.auditoriumId}
                  onChange={(e) => setNewShowtime({ ...newShowtime, auditoriumId: e.target.value })}
                >
                  <option value="">-- Select an auditorium --</option>
                  {cinemasList.flatMap((c) =>
                    (c.auditoriums || []).map((aud: any) => (
                      <option key={aud.id} value={aud.id}>
                        {c.name} — {aud.name} ({aud.screen_type})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    Start Time (UTC or ISO)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="input-field"
                    value={newShowtime.startTime}
                    onChange={(e) => setNewShowtime({ ...newShowtime, startTime: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    Base Price (cents, e.g. 2000 = $20.00)
                  </label>
                  <input
                    type="number"
                    required
                    className="input-field"
                    value={newShowtime.basePriceCents}
                    onChange={(e) => setNewShowtime({ ...newShowtime, basePriceCents: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '12px', fontSize: '1rem', marginTop: '10px' }}
              >
                Schedule Screening & Initialize Seats
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#c084fc" />
              Complete System Audit Logs
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                    <th style={{ padding: '12px 16px' }}>Entity</th>
                    <th style={{ padding: '12px 16px' }}>Actor</th>
                    <th style={{ padding: '12px 16px' }}>Payload / Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAuditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge badge-purple">
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'white', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {log.entity_type} ({log.entity_id ? log.entity_id.substring(0, 8) : 'sys'})
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {log.actor_name || log.actor_email || 'System Daemon'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {typeof log.metadata === 'object' ? JSON.stringify(log.metadata) : log.metadata}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
