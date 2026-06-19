import { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebase.js';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { LogIn, LogOut, Bell, Shield, BookOpen, Music, Check, Sparkles, Sun, Moon } from 'lucide-react';

export default function Navbar({ 
  user, 
  isAdmin, 
  onNavigateHome, 
  onOpenAdmin, 
  currentView, 
  isDarkMode, 
  onToggleDarkMode
}) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Load real-time personal student notifications from Firestore
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const notifPath = 'notifications';
    const q = query(collection(db, notifPath), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data(), notificationId: doc.id });
      });
      // Sort by creation date descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(items);
    }, (err) => {
      console.error('Failed to load notifications from Firestore:', err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Google Auth Popup Error:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      const docRef = doc(db, 'notifications', notifId);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="navbar-header" id="main_header">
      <div className="navbar-container app-container flex-between">
        
        {/* Logo and Brand */}
        <div 
          onClick={onNavigateHome}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          id="brand_logo_container"
        >
          <div style={{ display: 'flex', height: '3.5rem', width: '3rem', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <svg 
              style={{ height: '100%', width: '100%' }} 
              viewBox="0 0 100 120" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Guitar Neck & Strings */}
              <rect x="47" y="10" width="6" height="62" rx="1" fill="currentColor" />
              {/* Pegs/Tuners */}
              <circle cx="41" cy="15" r="1.5" fill="currentColor" />
              <circle cx="41" cy="22" r="1.5" fill="currentColor" />
              <circle cx="41" cy="29" r="1.5" fill="currentColor" />
              <circle cx="59" cy="15" r="1.5" fill="currentColor" />
              <circle cx="59" cy="22" r="1.5" fill="currentColor" />
              <circle cx="59" cy="29" r="1.5" fill="currentColor" />
              {/* Guitar Body Left Curve */}
              <path 
                d="M47 50C28 50 24 68 34 78C38 82 28 92 31 102C33 109 46 106 47 106" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {/* Soundhole with central vibrance glow */}
              <circle cx="50" cy="78" r="6.5" fill="black" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="50" cy="78" r="3.5" fill="#f59e0b" />
              {/* Pulse Vibration Waves on right */}
              <path 
                d="M57 78H62L64 70L67 86L70 63L73 92L76 72L79 81L85 78H94" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '0.875rem', fontWeight: '850', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-main)', lineHeight: 1 }}>
              Vibration
            </h1>
            <p style={{ fontSize: '0.625rem', fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.25rem' }}>
              Guitar Academy
            </p>
          </div>
        </div>

        {/* Navigation & Actions */}
        <div className="flex-row" id="header_actions">
          
          {/* Theme Mode Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', padding: '0.5rem', border: 'none', background: 'none' }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5" />}
          </button>
          
          {/* Admin shortcut if user is administrator */}
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              id="admin_view_toggle"
              className={`btn btn-sm ${currentView === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Shield className="h-4 w-4" />
              <span>Instructor Hub</span>
            </button>
          )}

          {/* Student Notifications Bell */}
          {user && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                id="bell_notification_button"
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '50%', padding: '0.5rem', background: 'none', border: 'none', position: 'relative' }}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 0, right: 0, display: 'flex', height: '1rem', width: '1rem', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#ffffff', fontSize: '0.625rem', fontWeight: 'bold' }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown list */}
              {showNotifMenu && (
                <div 
                  id="notifications_dropdown"
                  style={{ position: 'absolute', right: 0, marginTop: '0.5rem', width: '20rem', borderRadius: '1rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', padding: '1rem', boxShadow: 'var(--shadow-lg)', zIndex: 1000 }}
                  className="animate-fade"
                >
                  <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-main)' }}>Student Bulletins</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--primary)' }}>Real-time</span>
                  </div>
                  
                  <div style={{ maxHeight: '16rem', overflowY: 'auto' }} id="notification_list_container">
                    {notifications.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        No announcements posted yet
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                           key={notif.notificationId}
                           onClick={() => handleMarkAsRead(notif.notificationId)}
                           style={{ padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', backgroundColor: !notif.read ? 'rgba(255, 90, 31, 0.05)' : 'transparent', marginBottom: '0.25rem' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: !notif.read ? 'bold' : 'normal', color: !notif.read ? 'var(--primary)' : 'var(--text-main)' }}>
                                {notif.title}
                              </p>
                              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                                {notif.message}
                              </p>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {!notif.read && (
                              <button 
                                style={{ background: 'none', border: 'none', display: 'flex', height: '1.25rem', width: '1.25rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem', backgroundColor: 'var(--primary)', color: '#ffffff' }}
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User auth state profile container */}
          {user ? (
            <div className="flex-row" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{user.displayName}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--primary)', textTransform: 'uppercase' }}>
                  {isAdmin ? 'Elite Instructor' : 'Academy Student'}
                </span>
              </div>
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`}
                referrerPolicy="no-referrer"
                style={{ height: '2rem', width: '2rem', borderRadius: '50%', border: '1px solid var(--border-color)' }}
                alt="profile avatar"
              />
              <button
                onClick={handleLogout}
                id="logout_action_button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.375rem', background: 'none', border: 'none' }}
                title="Log Out"
              >
                <LogOut className="h-4 w-4" style={{ color: 'var(--red)' }} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              id="sign_in_trigger"
              className="btn btn-primary btn-sm"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign-In</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
