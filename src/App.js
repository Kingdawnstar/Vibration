import React, { useState, useEffect } from 'react';
import { auth, db, OperationType, handleFirestoreError } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { 
  Music, BookOpen, Search, Filter, ShieldAlert, Sparkles, CheckSquare, 
  HelpCircle, ChevronRight, UserCheck, Star, PlayCircle, Mail, Bell, Check,
  Layers, MessageSquare
} from 'lucide-react';
import Navbar from './components/Navbar.js';
import PostCard from './components/PostCard.js';
import PostDetail from './components/PostDetail.js';
import AdminPanel from './components/AdminPanel.js';
import GuitarSlider from './components/GuitarSlider.js';
import ScrollReveal from './components/ScrollReveal.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('home');

  // Light / Dark Mode theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme-mode');
    return saved ? saved === 'dark' : true; // Default to true (polished dark/amber theme)
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme-mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme-mode', 'light');
    }
  }, [isDarkMode]);

  // Lessons content states
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('all');

  // New modules: Student Reviews & Curriculum structured items
  const [reviews, setReviews] = useState([]);
  const [curriculum, setCurriculum] = useState([]);

  // User likes tracking state
  const [likedPosts, setLikedPosts] = useState({});

  // Auth synchronization loader state
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Subscriber panel states
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscribingStatus, setSubscribingStatus] = useState('idle');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subscriberEmail || !subscriberEmail.includes('@')) return;
    setSubscribingStatus('loading');
    try {
      const sanitizedEmail = subscriberEmail.trim().toLowerCase();
      // Safe dynamic code safe ID
      const subscriberId = sanitizedEmail.replace(/[^a-z0-9]/g, '_');
      const docRef = doc(db, 'subscribers', subscriberId);
      await setDoc(docRef, {
        subscriberId,
        email: sanitizedEmail,
        joinedAt: new Date().toISOString()
      });
      setSubscribingStatus('success');
      setSubscriberEmail('');
      setTimeout(() => {
        setSubscribingStatus('idle');
      }, 5000);
    } catch (err) {
      console.error('Newsletter enrollment error:', err);
      setSubscribingStatus('error');
    }
  };

  // States for student submitting dynamic review on the frontpage
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [studentRating, setStudentRating] = useState(5);
  const [studentLevel, setStudentLevel] = useState('Beginner');
  const [studentComment, setStudentComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState(null);

  const handlePublishStudentReview = async (e) => {
    e.preventDefault();
    if (!studentComment || studentComment.trim().length === 0) {
      alert('Review comment text is required.');
      return;
    }
    if (!user) {
      alert('Please log in using Google to publish a student review!');
      return;
    }

    setIsSubmittingReview(true);
    setReviewFeedback(null);
    const reviewsPath = 'reviews';
    try {
      const docRef = doc(collection(db, reviewsPath));
      const studentReviewPayload = {
        reviewId: docRef.id,
        name: user.displayName || 'Vibration Student',
        rating: Number(studentRating),
        proficientLevel: studentLevel,
        comment: studentComment.trim(),
        createdAt: new Date().toISOString()
      };
      await setDoc(docRef, studentReviewPayload);
      
      // Reset form variables
      setStudentComment('');
      setStudentRating(5);
      setReviewFeedback('Thank you! Your verified student rating was successfully published live!');
      setTimeout(() => setReviewFeedback(null), 8000);
      setShowWriteReview(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, reviewsPath);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const categories = [
    'All',
    'Beginner',
    'Intermediate',
    'Advanced'
  ];

  // 1. Listen for Authentication Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        // Enforce admin privileges
        const adminEmail = 'mrclabutu@gmail.com';
        const isUserAdmin = currentUser.email?.toLowerCase() === adminEmail.toLowerCase();
        setIsAdmin(isUserAdmin);

        // Auto-register profile in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              userId: currentUser.uid,
              name: currentUser.displayName || 'Vibration Student',
              email: currentUser.email || '',
              role: isUserAdmin ? 'admin' : 'user',
              createdAt: new Date().toISOString()
            });
            // Also register email inside admins table if they are admin
            if (isUserAdmin) {
              await setDoc(doc(db, 'admins', currentUser.uid), {
                email: currentUser.email
              });
            }
          }
        } catch (e) {
          console.error('Error auto-syncing student registration:', e);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load active lessons (posts) from Firestore in real-time
  useEffect(() => {
    const postPath = 'posts';
    const q = collection(db, postPath);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data(), postId: doc.id });
      });

      // Sort by creation date descending (latest lesson nodes first)
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // If database is initially empty, seed 3 beautiful starter lessons automatically
      if (items.length === 0) {
        console.log('No posts found. Seeding base guitar lessons database nodes...');
        await seedStarterLessons();
        await seedReviewsAndCurriculum();
      } else {
        setPosts(items);
        // Sync selectedPost if is currently opened
        if (selectedPost) {
          const updated = items.find(p => p.postId === selectedPost.postId);
          if (updated) setSelectedPost(updated);
        }
      }
    }, (err) => {
      console.error('Firestore posts snapshot streaming error:', err);
    });

    return () => unsubscribe();
  }, [selectedPost]);

  // Listen for Student Reviews testimonials dynamically
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data(), reviewId: doc.id });
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(items);
    }, (err) => {
      console.error('Firestore reviews streaming error:', err);
    });
    return () => unsubscribe();
  }, []);

  // Listen for Curriculum Items list dynamically
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'curriculum'), (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data(), itemId: doc.id });
      });
      items.sort((a, b) => {
        const levelOrder = { 'Beginner': 0, 'Intermediate': 1, 'Advanced': 2 };
        const aL = levelOrder[a.level] ?? 0;
        const bL = levelOrder[b.level] ?? 0;
        if (aL !== bL) return aL - bL;
        return a.order - b.order;
      });
      setCurriculum(items);
    }, (err) => {
      console.error('Firestore curriculum streaming error:', err);
    });
    return () => unsubscribe();
  }, []);

  // 3. User personalized Likes dictionary synchronization
  useEffect(() => {
    if (!user || posts.length === 0) {
      setLikedPosts({});
      return;
    }

    const likesPath = 'likes';
    const q = collection(db, likesPath);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userLikesMap = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId === user.uid) {
          userLikesMap[data.postId] = true;
        }
      });
      setLikedPosts(userLikesMap);
    }, (err) => {
      console.error('Failure tracking likes lists:', err);
    });

    return () => unsubscribe();
  }, [user, posts]);

  // Seeding default masterclasses
  const seedStarterLessons = async () => {
    const samples = [
      {
        title: '🎸 Ultimate Triad Passing Chords - Smooth Afrobeat Voicings',
        slug: 'ultimate-triad-passing-chords-afrobeat',
        category: 'Intermediate',
        type: 'lesson',
        content: `### 🥁 Afrobeat Guitar Lesson Masterclass\n\nWelcome to this elite tutorial on **Afrobeat Triads**.\nAfrobeat relies heavily on rhythmic interplay, syncopation, and minimalist clean tone voicing. Instead of using large bar chords, professional guitarists use three-string triads on the top strings (E, B, G) to slice cleanly through the drum mix!\n\n#### 🎯 Basic Philosophy\nIn Afrobeat guitar, less is more. Keep your wrist deeply relaxed and strike the strings with sharp, syncopated down-up strokes. Keep your treble high and bass low! \n\n#### 🎵 Core Rhythmic Progressions\nLet's analyze a progression in **C Major** shifting to **F Major** using standard neck shapes:\n\n\`\`\`\n  C Major Triad          F Major Triad\nE|--12--12--12--|      E|--8---8---8---|\nB|--13--13--13--|      B|--10--10--10--|\nG|--12--12--12--|      G|--10--10--10--|\nD|--------------|      D|--------------|\nA|--------------|      A|--------------|\nE|--------------|      E|--------------|\n\`\`\`\n\n#### ⚡ Practice Routine\n1. Play along with a standard Afrobeat drum-loop at 95 BPM.\n2. Emphasize the second beat and silence the strings on other rests using your fretting hand palm.`,
        videoUrl: 'https://www.youtube.com/embed/ZqL6p9LreX4',
        likesCount: 14,
        commentsCount: 2,
        media: [
          {
            name: '📝 [PDF Printout] Afrobeat Shapes Worksheet',
            url: 'https://vibration-academy.com/assets/sheets/afrobeat-triads.pdf',
            type: 'pdf'
          },
          {
            name: '📈 [Image Diagram] Fretboard Triad Cheat sheet',
            url: 'https://vibration-academy.com/assets/sheets/triads-cheat.jpg',
            type: 'image'
          }
        ],
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        title: '🙏 Gospel Guitar Chord Substitution & Grace Progression Tips',
        slug: 'gospel-guitar-chord-substitution-tips',
        category: 'Advanced',
        type: 'video',
        content: `### 🙏 Learn Soulful Gospel Voicings\n\nWelcome to Vibration Guitar Academy.\nIn this lesson, we break down standard soulful chord voicings used to accompany worship. We will take a simple, basic major progression and elevate it with elegant secondary dominants, major 7ths, and graceful hammer-on licks!\n\n#### 🎯 Chord Voicings (The 7-3-6 Progression)\nInstead of staying on standard major chords, we use soulful substitute chord shapes:\n\n\`\`\`\n  Cmaj9                  Am11\nE|--3--|               E|--5--|\nB|--3--|               B|--5--|\nG|--4--|               G|--5--|\nD|--2--|               D|--5--|\nA|--3--|               A|--x--|\nE|--x--|               E|--5--|\n\`\`\`\n\n#### ⚡ Gospel Practice Routine\n*   Start slow at 70 BPM with steady metronome-like quarter notes.\n*   Try feeding a light chorus on your amp model to introduce signature warmth and shimmer to your final tone.`,
        videoUrl: 'https://www.youtube.com/embed/A8g2WqX76q4',
        likesCount: 28,
        commentsCount: 1,
        media: [
          {
            name: '📊 [PDF Tabs] Gospel Movement Chords Sheet',
            url: 'https://vibration-academy.com/assets/sheets/gospel-harmonies.pdf',
            type: 'pdf'
          }
        ],
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        title: '⚡ Mastering The Pentatonic Solo Scale with Speed Patterns',
        slug: 'mastering-pentatonic-scale-speed-patterns',
        category: 'Beginner',
        type: 'blog',
        content: `### ⚡ Pentatonic Scale Mastery\n\nEvery great guitar solo trace back to the **Pentatonic Scale**.\nIn this workshop, we show you the 5 basic hand positions of the minor pentatonic, and introduce speed drill patterns designed to expand finger dexterity and speed.\n\n#### 📋 Master Schema (Shape 1 In A Minor)\n\n\`\`\`\nE|--5--------8--|\nB|--5--------8--|\nG|--5------7----|\nD|--5------7----|\nA|--5------7----|\nE|--5--------8--|\n\`\`\`\n\n#### 🎯 Practice Drill\n*   Ascend in overlapping triplets (1-2-3, 2-3-4, 3-4-5).\n*   Practice string-skipping exercises to master alternate picking controls across irregular neck ranges.`,
        videoUrl: 'https://www.youtube.com/embed/K81T7R9bZ2c',
        likesCount: 42,
        commentsCount: 0,
        media: [
          {
            name: '📊 [PDF Worksheets] 5 Pentatonic Boxes Chart',
            url: 'https://vibration-academy.com/assets/sheets/pentatonic-boxes.pdf',
            type: 'pdf'
          }
        ],
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
      }
    ];

    try {
      for (const s of samples) {
        const postRef = doc(collection(db, 'posts'));
        await setDoc(postRef, {
          ...s,
          postId: postRef.id
        });
      }
    } catch (e) {
      console.error('Error seeding initial data:', e);
    }
  };

  const seedReviewsAndCurriculum = async () => {
    try {
      const reviewSamples = [
        {
          name: 'David Olatunji',
          rating: 5,
          proficientLevel: 'Intermediate',
          comment: 'Feel the strings, own your vibration! This academy completely transformed my Afrobeat guitar triads and picking patterns.',
          createdAt: new Date().toISOString()
        },
        {
          name: 'Amina Mensah',
          rating: 5,
          proficientLevel: 'Beginner',
          comment: 'Perfect step-by-step videos and interactive materials for beginners. The slogan "Feel the strings, find your sound" sums up the vibe perfectly.',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          name: 'Efe Chukwu',
          rating: 5,
          proficientLevel: 'Advanced',
          comment: 'The 7-3-6 gospel substitution lessons and downloadables are top-notch. Truly owned my vibration here.',
          createdAt: new Date(Date.now() - 7200020).toISOString()
        }
      ];
      for (const r of reviewSamples) {
        const revRef = doc(collection(db, 'reviews'));
        await setDoc(revRef, {
          ...r,
          reviewId: revRef.id
        });
      }

      const currSamples = [
        {
          level: 'Beginner',
          title: 'Introduction to Smooth open Chords & Strumming Patterns',
          description: 'Master major-minor chords and keep clean time across simple Afrobeat guides.',
          order: 1,
          createdAt: new Date().toISOString()
        },
        {
          level: 'Beginner',
          title: 'Ultimate Alternate Picking Control Fills',
          description: 'Basic exercises for wrist control and rhythmic hand-sync drills.',
          order: 2,
          createdAt: new Date().toISOString()
        },
        {
          level: 'Intermediate',
          title: 'Afrobeat Clean Triad Inversions & Riffs',
          description: 'Shifting triads on E-B-G-D strings smoothly to slice through any live musical ensemble.',
          order: 1,
          createdAt: new Date().toISOString()
        },
        {
          level: 'Intermediate',
          title: 'Deep Rhythmic Syncopations and Double Stops',
          description: 'Adding sweet rhythmic slides and secondary percussion vibes inside your strums.',
          order: 2,
          createdAt: new Date().toISOString()
        },
        {
          level: 'Advanced',
          title: 'Gospel Passing Chords and Grace Substitution Progressions',
          description: 'Applying secondary dominant and diminished movements within traditional chord scales.',
          order: 1,
          createdAt: new Date().toISOString()
        },
        {
          level: 'Advanced',
          title: 'Fluid Scale Soloing, Speed Drills & Modes Layout',
          description: 'Advanced pentatonic phrasing, chord tone soling tricks, and speed hammer-ons.',
          order: 2,
          createdAt: new Date().toISOString()
        }
      ];
      for (const c of currSamples) {
        const currRef = doc(collection(db, 'curriculum'));
        await setDoc(currRef, {
          ...c,
          itemId: currRef.id,
          postId: ''
        });
      }
      console.log('Seeded high-quality local reviews and curriculum elements successfully!');
    } catch (err) {
      console.error('Seeding errored:', err);
    }
  };

  const handleLikeToggle = async (postId) => {
    if (!user) {
      alert('Please register or sign in using Google login to like academy lessons.');
      return;
    }

    const likeId = `${user.uid}_${postId}`;
    const isCurrentlyLiked = likedPosts[postId] || false;

    const likeRef = doc(db, 'likes', likeId);
    const postRef = doc(db, 'posts', postId);

    // Optimized client UI update
    setLikedPosts(prev => ({
      ...prev,
      [postId]: !isCurrentlyLiked
    }));

    try {
      if (isCurrentlyLiked) {
        // Unlike
        await deleteDoc(likeRef);
        await updateDoc(postRef, {
          likesCount: increment(-1)
        });
      } else {
        // Like
        await setDoc(likeRef, {
          likeId,
          postId,
          userId: user.uid,
          createdAt: new Date().toISOString()
        });
        await updateDoc(postRef, {
          likesCount: increment(1)
        });
      }
    } catch (err) {
      // Revert UI on failure
      setLikedPosts(prev => ({
        ...prev,
        [postId]: isCurrentlyLiked
      }));
      handleFirestoreError(err, OperationType.WRITE, `likes/${likeId}`);
    }
  };

  // Filter & Search implementation
  const filteredPosts = posts.filter((post) => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const pType = post.type || (post.videoUrl ? 'video' : 'lesson');
    const matchesType = selectedType === 'all' || pType === selectedType;
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (post.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesType && matchesSearch;
  });

  return (
    <div className={`app-wrapper ${isDarkMode ? 'dark' : 'light'}`} id="main_app_wrapper">
      
      {/* Premium Header/Nav */}
      <Navbar 
        user={user} 
        isAdmin={isAdmin} 
        onNavigateHome={() => { setView('home'); setSelectedPost(null); }}
        onOpenAdmin={() => setView('admin')}
        currentView={view}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Core Area limits */}
      <div className="app-container" style={{ padding: '2rem 1rem' }} id="primary_page_container">
        
        <div style={{ display: 'grid', gridTemplateColumns: (view === 'home' && !selectedPost && window.innerWidth > 992) ? '1fr 3fr' : '1fr', gap: '2rem' }}>
          
          {/* Left Sidebar Curriculum list - matching Editorial Aesthetic design mock layout */}
          {view === 'home' && !selectedPost && (
            <aside id="editorial_curriculum_sidebar">
              <div className="card sticky-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.2rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 'bold' }}>Curriculum</h3>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0, margin: 0 }}>
                    {categories.map((cat) => {
                      const isActive = selectedCategory === cat;
                      return (
                        <li key={cat}>
                          <button
                            onClick={() => setSelectedCategory(cat)}
                            className="btn"
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                              fontWeight: isActive ? 'bold' : 'normal',
                              padding: '0.25rem 0',
                              background: 'none',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <span style={{
                              display: 'inline-block',
                              width: '0.375rem',
                              height: '0.375rem',
                              borderRadius: '50%',
                              backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                              border: '1px solid var(--border-color)'
                            }} />
                            {cat}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                 <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.15rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 'bold' }}>interactive Syllabus</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {['Beginner', 'Intermediate', 'Advanced'].map((level) => {
                      const levelItems = curriculum.filter(i => i.level === level);
                      return (
                        <div key={level} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          <span className="badge badge-beginner" style={{ display: 'inline-block', alignSelf: 'flex-start', fontSize: '0.625rem', fontWeight: 'bold' }}>
                            {level}
                          </span>
                          {levelItems.length === 0 ? (
                            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '0.5rem' }}>Syllabus updates pending...</p>
                          ) : (
                            <ul style={{ listStyle: 'none', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-color)', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {levelItems.map((item) => (
                                <li key={item.itemId} style={{ fontSize: '0.6875rem' }}>
                                  {item.postId ? (
                                    <button
                                      onClick={() => {
                                        const p = posts.find(post => post.postId === item.postId);
                                        if (p) setSelectedPost(p);
                                      }}
                                      style={{ display: 'inline-block', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                                    >
                                      <strong style={{ color: 'var(--primary)' }}>⚡ {item.title}</strong>
                                    </button>
                                  ) : (
                                    <div style={{ color: 'var(--text-muted)' }}>
                                      <strong style={{ color: 'var(--text-main)' }}>{item.title}</strong>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left Sidebar newsletter alert box */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.15rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Bell className="h-4 w-4 text-amber-500" /> Lesson Alerts
                  </h3>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.75rem' }}>Subscribe to get alerts as soon as I post new materials!</p>
                  <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="email"
                      required
                      value={subscriberEmail}
                      onChange={(e) => setSubscriberEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="form-control"
                      style={{ fontSize: '0.75rem', padding: '0.5rem' }}
                    />
                    <button
                      type="submit"
                      disabled={subscribingStatus === 'loading'}
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem' }}
                    >
                      {subscribingStatus === 'loading' ? 'Subscribing...' : 'Join Classroom'}
                    </button>
                  </form>
                  {subscribingStatus === 'success' && (
                    <p style={{ color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', marginTop: '0.5rem', textTransform: 'uppercase' }}>
                      ✓ Successfully enlisted!
                    </p>
                  )}
                  {subscribingStatus === 'error' && (
                    <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', marginTop: '0.5rem', textTransform: 'uppercase' }}>
                      ✗ Error. Try again.
                    </p>
                  )}
                </div>

                {user && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img 
                      src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} 
                      alt="Profile avatar" 
                      referrerPolicy="no-referrer"
                      style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '1px solid var(--border-color)' }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>{user.displayName}</p>
                      <p style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', textTransform: 'uppercase', margin: 0 }}>{isAdmin ? 'Instructor' : 'Verified Student'}</p>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Core main timeline section */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {view === 'admin' ? (
              /* Instructor portal admin layout */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-serif)', color: 'var(--text-main)' }}>
                      Instructor Hub Console
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Add materials, edit lesson flows, and notify students instantly.</p>
                  </div>
                  <button
                    onClick={() => setView('home')}
                    className="btn btn-secondary"
                  >
                    Exit Console
                  </button>
                </div>
                
                <AdminPanel 
                  onPostPublished={() => { setView('home'); }} 
                  existingPosts={posts} 
                  onSelectPost={(p) => { setSelectedPost(p); setView('home'); }}
                  reviews={reviews}
                  curriculum={curriculum}
                />
              </div>
            ) : (
              /* Student home explore dashboard */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} id="student_home_timeline">
                
                {selectedPost ? (
                  <PostDetail 
                    post={selectedPost} 
                    user={user} 
                    isAdmin={isAdmin}
                    userLiked={likedPosts[selectedPost.postId] || false}
                    onLikeToggle={handleLikeToggle}
                    onClose={() => setSelectedPost(null)}
                  />
                ) : (
                  <>
                    {/* Hero branding header */}
                    <ScrollReveal>
                      <div 
                        className="hero-section"
                        id="academy_hero_billboard"
                      >
                        <div className="relative" style={{ zIndex: 2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <span className="badge badge-beginner" style={{ padding: '0.25rem 0.5rem', fontSize: '0.625rem', fontWeight: 'bold' }}>
                              VIBRATION PREMIUM
                            </span>
                            <span className="badge badge-advanced" style={{ padding: '0.25rem 0.5rem', fontSize: '0.625rem', fontWeight: 'bold' }}>
                              GUITAR STUDIO
                            </span>
                          </div>

                          <h2 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-serif)', fontWeight: 'bold', color: '#ffffff', margin: 0, lineHeight: 1.1 }}>
                            Vibration Guitar Academy
                          </h2>
                          
                          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--primary)', fontSize: '1rem', margin: 0 }}>
                            "Feel the strings, find your sound and own your vibration"
                          </p>
                          
                          <p style={{ margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: '0.8125rem', color: '#e4e4e7', maxWidth: '400px', lineHeight: 1.5 }}>
                            Master smooth rhythm, soulful chord projections, and scales with premium files downloadables and WhatsApp companion tools.
                          </p>

                          <div className="flex-row" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.625rem', fontFamily: 'var(--font-mono)' }}>
                            <div style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(0, 0, 0, 0.65)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span className="pulse-indicator" style={{ height: '0.5rem', width: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                              <span>{posts.length}+ lesson modules</span>
                            </div>
                            <div style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(0, 0, 0, 0.65)', border: '1px solid var(--border-color)' }}>
                              <span>Verified Students Access</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>

                    {/* Rare Guitars Interactive Slide Showcase */}
                    <GuitarSlider />

                    {/* Roadmap Outline */}
                    {curriculum.length > 0 && (
                      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '1.25rem' }} id="interactive_syllabus_showcase">
                        <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-main)' }}>
                              <Layers className="h-5 w-5 text-orange-500" /> Academy Syllabus & Class Tracks
                            </h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>Step-by-step masterclasses and course roadmaps.</p>
                          </div>
                          <span className="badge badge-beginner" style={{ fontWeight: 'bold' }}>
                            {curriculum.length} core topics
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                          {['Beginner', 'Intermediate', 'Advanced'].map((level) => {
                            const levelItems = curriculum.filter(i => i.level === level);
                            return (
                              <div key={level} className="card" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', margin: 0, padding: '1.25rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                  <span className={`badge ${level === 'Beginner' ? 'badge-beginner' : level === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'}`} style={{ fontWeight: 'bold', fontSize: '0.6875rem' }}>
                                    {level} Track
                                  </span>
                                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{levelItems.length} modules</span>
                                </div>

                                {levelItems.length === 0 ? (
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>Roadmap outline updates pending...</p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {levelItems.map((item) => {
                                      const hasLink = posts.some(p => p.postId === item.postId);
                                      return (
                                        <div key={item.itemId} style={{ paddingLeft: '0.75rem', borderLeft: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                          <h4 style={{ fontSize: '0.8125rem', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>{item.title}</h4>
                                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>{item.description}</p>
                                          {item.postId && hasLink && (
                                            <button
                                              onClick={() => {
                                                const p = posts.find(post => post.postId === item.postId);
                                                if (p) setSelectedPost(p);
                                              }}
                                              style={{ display: 'inline-flex', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '0.25rem', padding: 0 }}
                                            >
                                              ⚡ Open lesson →
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* VIP Student Alert Desk Form */}
                    <ScrollReveal>
                      <div 
                        className="card"
                        id="student_newsletter_signup"
                        style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span className="badge badge-beginner animate-fade" style={{ display: 'inline-flex', alignSelf: 'flex-start', fontSize: '0.625rem', fontWeight: 'bold' }}>
                            📨 Announcements alerts desk
                          </span>
                          <h3 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-serif)', color: 'var(--text-main)', margin: 0 }}>
                            Instant classroom broadcast alerts
                          </h3>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                            Add your email to receive automatic live notifications directly. Whenever the academy instructor publishes new tutorials, chord sheets, progression tabs or blog notes, we broadcast standard email updates!
                          </p>
                          
                          <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            <input
                              type="email"
                              required
                              value={subscriberEmail}
                              onChange={(e) => setSubscriberEmail(e.target.value)}
                              placeholder="your.email@example.com"
                              className="form-control"
                              style={{ flex: 1, minWidth: '150px' }}
                            />
                            <button
                              type="submit"
                              disabled={subscribingStatus === 'loading'}
                              className="btn btn-primary"
                            >
                              <span>Join Classroom Alerts list</span>
                            </button>
                          </form>
                          
                          {subscribingStatus === 'success' && (
                            <p style={{ color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                              ✨ Added successfully! You will now receive automatic notifications.
                            </p>
                          )}
                          {subscribingStatus === 'error' && (
                            <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                              ❌ Subscription error. Please verify input and retry.
                            </p>
                          )}
                        </div>
                      </div>
                    </ScrollReveal>

                    {/* Dashboard Genre Toggles */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }} id="dashboard_genre_toggles">
                      {[
                        { id: 'all', label: 'All', icon: '🎵', count: posts.length },
                        { id: 'lesson', label: 'Lessons', icon: '📚', count: posts.filter(p => !p.type || p.type === 'lesson').length },
                        { id: 'video', label: 'Videos', icon: '🎥', count: posts.filter(p => p.type === 'video' || (!p.type && p.videoUrl)).length },
                        { id: 'blog', label: 'Blogs', icon: '✍️', count: posts.filter(p => p.type === 'blog').length },
                      ].map((item) => {
                        const isSelected = selectedType === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => { setSelectedType(item.id); setSelectedCategory('All'); }}
                            className="card flex-center"
                            style={{
                              padding: '0.75rem 0.5rem',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                              backgroundColor: isSelected ? 'var(--bg-app)' : 'var(--bg-card)',
                              color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              margin: 0,
                              textAlign: 'center',
                              borderRadius: '0.75rem'
                            }}
                          >
                            <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{item.icon}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{item.label}</div>
                            <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{item.count} items</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Index Panel */}
                    <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} id="search_indexing_hub">
                      <div style={{ position: 'relative' }}>
                        <Search className="h-4 w-4" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder="Search progression chords, scales, Afrobeats tabs, or keys..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="form-control"
                          style={{ paddingLeft: '2.25rem', borderRadius: '2rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }} id="category_tags_container">
                        <Filter className="h-4 w-4 text-zinc-500" style={{ marginRight: '0.25rem' }} />
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className="btn"
                            style={{
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.6875rem',
                              backgroundColor: selectedCategory === cat ? 'var(--primary)' : 'var(--bg-app)',
                              color: selectedCategory === cat ? '#ffffff' : 'var(--text-muted)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '0.375rem'
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Explore list of post items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.15rem', color: 'var(--text-muted)', margin: 0 }}>
                          Classroom Materials ({filteredPosts.length})
                        </h3>
                        {selectedCategory !== 'All' && (
                          <button 
                            onClick={() => setSelectedCategory('All')} 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.125rem 0.5rem', fontSize: '0.6875rem' }}
                          >
                            Reset filters
                          </button>
                        )}
                      </div>

                      {filteredPosts.length === 0 ? (
                        <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '1rem' }}>
                          <Music className="h-8 w-8 text-zinc-500" style={{ margin: '0 auto' }} />
                          <h4 style={{ margin: '0.5rem 0 0 0', fontFamily: 'var(--font-serif)' }}>No matching masterclasses yet</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Simplify your keywords or reset active category tags.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                          {filteredPosts.map((post, index) => (
                            <ScrollReveal key={post.postId} delay={(index % 4) * 80}>
                              <PostCard
                                post={post}
                                userLiked={likedPosts[post.postId] || false}
                                onLikeToggle={handleLikeToggle}
                                onSelect={(p) => setSelectedPost(p)}
                              />
                            </ScrollReveal>
                          ))}
                        </div>
                      )}
                    </div>



                    {/* Testimonials */}
                    {reviews.length > 0 && (
                      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} id="student_reviews_section">
                        <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '0.375rem', margin: 0 }}>
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Student Praise
                            </h3>
                            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.125rem 0 0 0' }}>Real feedback from guitarists who owned their chord vibration!</p>
                          </div>

                          <div className="flex-row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div className="flex-row" style={{ gap: '0.125rem' }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className="h-3.5 w-3.5" style={{ fill: 'var(--amber)', color: 'var(--amber)' }} />
                              ))}
                            </div>
                            {user ? (
                              <button
                                onClick={() => { setShowWriteReview(!showWriteReview); setReviewFeedback(null); }}
                                className="btn btn-secondary btn-sm"
                              >
                                {showWriteReview ? 'Close Testimonial form' : '✍️ Testify praise'}
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>(Google sign-in to review)</span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Review writer component */}
                        {showWriteReview && user && (
                          <form onSubmit={handlePublishStudentReview} className="card animate-fade" style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: 0, padding: '1rem' }}>
                            <div className="flex-between">
                              <h4 style={{ fontSize: '0.75rem', fontFamily: 'var(--font-serif)', margin: 0 }}>Write dynamic testimonial rating</h4>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Posting as {user.displayName}</span>
                            </div>

                            {reviewFeedback && (
                              <p style={{ color: 'var(--emerald)', fontSize: '0.75rem', margin: 0, fontWeight: 'bold' }}>{reviewFeedback}</p>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Proficiency Level</label>
                                <select
                                  value={studentLevel}
                                  onChange={(e) => setStudentLevel(e.target.value)}
                                  className="form-control"
                                >
                                  <option value="Beginner">Beginner level</option>
                                  <option value="Intermediate">Intermediate level</option>
                                  <option value="Advanced">Advanced level</option>
                                </select>
                              </div>

                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Score (1-5 Stars)</label>
                                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                                  {[1, 2, 3, 4, 5].map((stars) => (
                                    <button
                                      type="button"
                                      key={stars}
                                      onClick={() => setStudentRating(stars)}
                                      style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                                    >
                                      <Star 
                                        className="h-5 w-5" 
                                        style={{
                                          color: 'var(--amber)',
                                          fill: stars <= studentRating ? 'var(--amber)' : 'none'
                                        }} 
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Testimonial feedback text</label>
                              <textarea
                                rows={2}
                                value={studentComment}
                                onChange={(e) => setStudentComment(e.target.value)}
                                placeholder="e.g. This simple academy is beautiful. Triads templates saved me weeks..."
                                className="form-control"
                                maxLength={800}
                                required
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                type="submit"
                                disabled={isSubmittingReview}
                                className="btn btn-primary btn-sm"
                              >
                                {isSubmittingReview ? 'Publishing...' : 'Publish Testimonial Review'}
                              </button>
                            </div>
                          </form>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                          {reviews.map((rev) => (
                            <div key={rev.reviewId} className="card animate-fade" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-color)', margin: 0, padding: '1rem' }}>
                              <div>
                                <div style={{ display: 'flex', gap: '0.125rem', marginBottom: '0.5rem' }}>
                                  {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                    <Star key={i} className="h-3 w-3" style={{ fill: 'var(--amber)', color: 'var(--amber)' }} />
                                  ))}
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
                                  "{rev.comment}"
                                </p>
                              </div>
                              <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.75rem', fontSize: '0.6875rem' }}>
                                <span style={{ fontWeight: 'bold' }}>{rev.name}</span>
                                <span className="badge badge-intermediate" style={{ fontSize: '0.625rem' }}>
                                  {rev.proficientLevel}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Low-bandwidth optimized disclaimer footer */}
                    <footer className="card" style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#0F0F0F', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', margin: 0, color: '#ffffff' }}>Vibration Guitar Academy</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15rem', marginTop: '0.5rem', margin: 0 }}>
                        Low-bandwidth optimized. Custom tailored exclusively for students of Vibration Guitar Academy.
                      </p>
                    </footer>
                  </>
                )}

              </div>
            )}
          </main>

        </div>

      </div>
    </div>
  );
}
