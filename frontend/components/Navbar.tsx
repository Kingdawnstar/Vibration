import { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { LogIn, LogOut, Bell, Shield, BookOpen, Music, Check, Sparkles, Sun, Moon } from 'lucide-react';
import { NotificationFeed } from '../types';

interface NavbarProps {
  user: User | null;
  isAdmin: boolean;
  onNavigateHome: () => void;
  onOpenAdmin: () => void;
  currentView: 'home' | 'admin';
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Navbar({ 
  user, 
  isAdmin, 
  onNavigateHome, 
  onOpenAdmin, 
  currentView, 
  isDarkMode, 
  onToggleDarkMode 
}: NavbarProps) {
  const [notifications, setNotifications] = useState<NotificationFeed[]>([]);
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
      const items: NotificationFeed[] = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data() as NotificationFeed, notificationId: doc.id });
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

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const docRef = doc(db, 'notifications', notifId);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className={`sticky top-0 z-50 w-full border-b backdrop-blur-md transition-colors duration-300 ${
      isDarkMode 
        ? 'border-zinc-800 bg-[#0A0A0A]/95 text-zinc-100' 
        : 'border-zinc-200 bg-white/95 text-zinc-800 shadow-sm'
    }`} id="main_header">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand */}
        <div 
          onClick={onNavigateHome}
          className="group flex cursor-pointer items-center space-x-3.5 transition-opacity hover:opacity-95"
          id="brand_logo_container"
        >
          <div className="relative flex h-14 w-12 items-center justify-center text-amber-500">
            <svg 
              className="h-full w-full transition-transform duration-300 group-hover:scale-110" 
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
              <circle cx="50" cy="78" r="3.5" fill="#f59e0b" className="animate-pulse" />
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
            <h1 className="font-serif text-sm font-bold tracking-[0.25em] text-white uppercase leading-none">
              Vibration
            </h1>
            <p className="text-[9px] font-sans font-medium tracking-[0.1em] text-zinc-400 mt-1 uppercase">
              WhatsApp Guitar School
            </p>
          </div>
        </div>

        {/* Navigation & Actions */}
        <div className="flex items-center space-x-4" id="header_actions">
          
          {/* Theme Mode Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800/15 dark:hover:bg-zinc-900 hover:text-amber-500 transition-colors focus:outline-none cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-amber-500 animate-pulse" /> : <Moon className="h-5 w-5 text-zinc-550" />}
          </button>
          
          {/* Admin shortcut if user is administrator */}
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              id="admin_view_toggle"
              className={`flex items-center space-x-1.5 rounded border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                currentView === 'admin' 
                  ? 'bg-amber-500 border-amber-500 text-black' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Instructor Hub</span>
            </button>
          )}

          {/* Student Notifications Bell */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                id="bell_notification_button"
                className="relative rounded-full p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white focus:outline-none"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-extrabold text-black ring-2 ring-[#0A0A0A]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown list */}
              {showNotifMenu && (
                <div 
                  id="notifications_dropdown"
                  className="absolute right-0 mt-2.5 w-80 rounded border border-zinc-800 bg-[#0F0F0F] p-2 shadow-2xl ring-1 ring-black/50 z-50 animate-fadeIn"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                    <span className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Student Bulletins</span>
                    <span className="font-mono text-[9px] text-amber-500">Real-time</span>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto" id="notification_list_container">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-zinc-500">
                        No announcements posted yet
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                           key={notif.notificationId}
                           onClick={() => handleMarkAsRead(notif.notificationId)}
                           className={`group cursor-pointer rounded p-2.5 transition-colors hover:bg-zinc-900 ${
                             !notif.read ? 'bg-amber-500/5' : ''
                           }`}
                        >
                          <div className="flex items-start justify-between space-x-1.5">
                            <div>
                              <p className={`text-xs ${!notif.read ? 'font-bold text-amber-400' : 'text-zinc-300'}`}>
                                {notif.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-2">
                                {notif.message}
                              </p>
                              <span className="mt-1 block font-mono text-[9px] text-zinc-500">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {!notif.read && (
                              <button 
                                className="flex h-5 w-5 items-center justify-center rounded bg-amber-500 text-black opacity-0 transition-opacity group-hover:opacity-100"
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
            <div className="flex items-center space-x-3 border-l border-zinc-800 pl-3">
              <div className="hidden flex-col text-right sm:flex">
                <span className="text-xs font-bold text-zinc-105 line-clamp-1">{user.displayName}</span>
                <span className="font-mono text-[9px] text-amber-500 uppercase tracking-tighter">
                  {isAdmin ? 'Elite Instructor' : 'Academy Student'}
                </span>
              </div>
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-zinc-705"
                alt="profile avatar"
              />
              <button
                onClick={handleLogout}
                id="logout_action_button"
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-red-400 transition-colors"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              id="sign_in_trigger"
              className="flex items-center space-x-2 rounded bg-amber-500 px-4 py-2 text-xs font-bold text-black uppercase tracking-widest transition-all hover:bg-amber-400 focus:outline-none"
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
