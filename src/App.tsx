import React, { useState, useEffect } from 'react';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { 
  Music, BookOpen, Search, Filter, ShieldAlert, Sparkles, CheckSquare, 
  HelpCircle, ChevronRight, UserCheck, Star, PlayCircle, Mail, Bell, Check
} from 'lucide-react';
import Navbar from './components/Navbar';
import PostCard from './components/PostCard';
import PostDetail from './components/PostDetail';
import AdminPanel from './components/AdminPanel';
import { Post, Review, CurriculumItem } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'home' | 'admin'>('home');

  // Lessons content states
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState<'all' | 'lesson' | 'video' | 'blog'>('all');

  // New modules: Student Reviews & Curriculum structured items
  const [reviews, setReviews] = useState<Review[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);

  // User likes tracking state (dictionary where keys are postIds and values are booleans)
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  // Auth synchronization loader state
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Subscriber panel states
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscribingStatus, setSubscribingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      console.error('Newsletter enrollment error:', err);
      setSubscribingStatus('error');
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

        // Auto-register profile in Firestore of the guitar academy student group (if not exists yet)
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
      const items: Post[] = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data() as Post, postId: doc.id });
      });

      // Sort by creation date descending (latest lesson nodes first)
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // If database is initially empty, seed 3 beautiful starter lessons automatically so the app is populated out of the box!
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
      const items: Review[] = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data() as Review, reviewId: doc.id });
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
      const items: CurriculumItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data() as CurriculumItem, itemId: doc.id });
      });
      items.sort((a, b) => {
        const levelOrder = { 'Beginner': 0, 'Intermediate': 1, 'Advanced': 2 };
        const aL = levelOrder[a.level as keyof typeof levelOrder] ?? 0;
        const bL = levelOrder[b.level as keyof typeof levelOrder] ?? 0;
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
      const userLikesMap: Record<string, boolean> = {};
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

  // Seeding high-quality default masterclasses to prevent empty landing page
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
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
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
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString() // 24 hours ago
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
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString() // 48 hours ago
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
          createdAt: new Date(Date.now() - 7200000).toISOString()
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

  // 4. Handle Like Toggle Event with Zero-Trust Security Checking
  const handleLikeToggle = async (postId: string) => {
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
        // Unlike - Delete record and decrement post likesCount synchronously
        await deleteDoc(likeRef);
        await updateDoc(postRef, {
          likesCount: increment(-1)
        });
      } else {
        // Like - Add model record and increment post likesCount
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
    } catch (err: any) {
      // Revert UI if rules rejected the write operation
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
    const postType = post.type || (post.videoUrl ? 'video' : 'lesson');
    const matchesType = selectedType === 'all' || postType === selectedType;
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans antialiased text-zinc-150 selection:bg-amber-500 selection:text-black" id="main_app_wrapper">
      
      {/* Premium Header/Nav */}
      <Navbar 
        user={user} 
        isAdmin={isAdmin} 
        onNavigateHome={() => { setView('home'); setSelectedPost(null); }}
        onOpenAdmin={() => setView('admin')}
        currentView={view}
      />

      {/* Main Core Area limits */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="primary_page_container">
        
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          
          {/* Left Sidebar Curriculum list - matching Editorial Aesthetic design mock layout */}
          {view === 'home' && !selectedPost && (
            <aside className="hidden lg:block lg:col-span-1 space-y-6" id="editorial_curriculum_sidebar">
              <div className="rounded-2xl border border-zinc-800 bg-[#0F0F0F] p-6 space-y-8 sticky top-28">
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-5 font-bold">Curriculum</h3>
                  <ul className="space-y-4 text-xs font-semibold">
                    {categories.map((cat) => {
                      const isActive = selectedCategory === cat;
                      return (
                        <li key={cat}>
                          <button
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex items-center gap-3 transition-colors text-left w-full ${
                              isActive ? 'text-amber-500 font-bold' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full transition-all ${
                              isActive ? 'bg-amber-500 scale-125' : 'bg-transparent border border-zinc-700'
                            }`} />
                            {cat}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                 <div className="border-t border-zinc-800 pt-6">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-4 font-bold">Interactive Syllabus</h3>
                  <div className="space-y-4">
                    {['Beginner', 'Intermediate', 'Advanced'].map((level) => {
                      const levelItems = curriculum.filter(i => i.level === level);
                      return (
                        <div key={level} className="space-y-2">
                          <span className={`text-[8px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            level === 'Beginner' ? 'bg-emerald-950/60 text-emerald-400' :
                            level === 'Intermediate' ? 'bg-blue-950/60 text-blue-400' :
                            'bg-red-950/60 text-red-400'
                          }`}>
                            {level}
                          </span>
                          {levelItems.length === 0 ? (
                            <p className="text-[10px] text-zinc-600 italic pl-2">Syllabus outline pending...</p>
                          ) : (
                            <ul className="space-y-2 pl-1.5 border-l border-zinc-800">
                              {levelItems.map((item) => (
                                <li key={item.itemId} className="text-[11px] leading-tight group">
                                  {item.postId ? (
                                    <button
                                      onClick={() => {
                                        const p = posts.find(post => post.postId === item.postId);
                                        if (p) setSelectedPost(p);
                                      }}
                                      className="text-zinc-400 hover:text-amber-400 text-left transition-colors font-medium flex items-start gap-1 w-full"
                                    >
                                      <span className="text-amber-500 text-[10px] shrink-0 mt-0.5">⚡</span>
                                      <span>
                                        <strong className="text-zinc-200 group-hover:text-amber-400">{item.title}</strong>
                                      </span>
                                    </button>
                                  ) : (
                                    <div className="text-zinc-500">
                                      <strong className="text-zinc-400">{item.title}</strong>: {item.description}
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
                <div className="border-t border-zinc-800 pt-6">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-4 font-bold flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-amber-500" /> New Post Alerts
                  </h3>
                  <p className="text-[11px] text-zinc-500 leading-normal mb-3">Enlist your email to receive broadcast alerts whenever the owner posts.</p>
                  <form onSubmit={handleSubscribe} className="space-y-2">
                    <input
                      type="email"
                      required
                      value={subscriberEmail}
                      onChange={(e) => setSubscriberEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-white placeholder-zinc-650 focus:border-amber-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={subscribingStatus === 'loading'}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {subscribingStatus === 'loading' ? 'Enrolling...' : 'Join Broadcast List'}
                    </button>
                  </form>
                  {subscribingStatus === 'success' && (
                    <p className="text-amber-500 font-mono text-[9px] mt-2 uppercase tracking-wider flex items-center gap-1 leading-none animate-fadeIn">
                      ✓ Successfully enlisted!
                    </p>
                  )}
                  {subscribingStatus === 'error' && (
                    <p className="text-red-500 font-mono text-[9px] mt-2 uppercase tracking-wider flex items-center gap-1 leading-none animate-fadeIn">
                      ✗ Enlist error. Retry.
                    </p>
                  )}
                </div>

                {user && (
                  <div className="border-t border-zinc-800 pt-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-705 bg-zinc-800 flex-shrink-0">
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} 
                        alt="Profile avatar" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[11px] overflow-hidden">
                      <p className="font-bold text-zinc-200 line-clamp-1 truncate">{user.displayName}</p>
                      <p className="text-amber-500 font-mono tracking-wider uppercase text-[9px]">{isAdmin ? 'Academy Editor' : 'Student Pro'}</p>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Core main timeline section */}
          <main className={`col-span-1 ${view === 'home' && !selectedPost ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-8`}>
            {view === 'admin' ? (
              /* Instructor publishing portal admin layout */
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h2 className="text-2xl font-serif italic font-light tracking-tight text-white mb-1">
                      Instructor Hub Console
                    </h2>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-wide">Add materials, edit lesson flows, and dispatch student emails.</p>
                  </div>
                  <button
                    onClick={() => setView('home')}
                    className="rounded border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-800 hover:text-white"
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
              /* Student home layout explore dashboard */
              <div className="space-y-8" id="student_home_timeline">
                
                {/* Conditional Detailed single post page */}
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
                    {/* Stunning Hero branding header */}
                    <div 
                      className="relative overflow-hidden rounded-3xl bg-zinc-900 px-6 py-12 text-white border border-zinc-800/80 shadow-2xl sm:px-12 sm:py-16 md:px-16"
                      id="academy_hero_billboard"
                    >
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550985616-10810253b84d?q=80&w=2000')] bg-cover bg-center opacity-45"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                      
                      <div className="relative max-w-2xl">
                        <div className="flex gap-2 mb-4">
                          <span className="px-2 py-0.5 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-sm">
                            VIBRATION PREMIUM
                          </span>
                          <span className="px-2 py-0.5 bg-zinc-100 text-black text-[9px] font-black uppercase tracking-widest rounded-sm">
                            GUITAR STUDIO
                          </span>
                        </div>

                        <h2 className="text-4xl font-serif font-light leading-none mb-3 italic tracking-tight sm:text-5xl md:text-6xl">
                          Vibration Guitar Academy
                        </h2>
                        
                        <p className="font-serif italic text-amber-400 text-sm sm:text-base mb-4 tracking-wide font-light">
                          "Feel the strings, find your sound and own your vibration"
                        </p>
                        
                        <p className="mt-2 text-zinc-300 text-sm leading-relaxed max-w-sm">
                          Master smooth Afrobeat triads, gospel chord substitution templates, and minor solo layouts with instant downloadables and WhatsApp group connectivity.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4 text-[10px] font-mono">
                          <div className="flex items-center space-x-2 rounded bg-black/60 px-3.5 py-1.5 border border-zinc-800 backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-zinc-300 uppercase tracking-widest">{posts.length}+ active masterclasses</span>
                          </div>
                          <div className="flex items-center space-x-2 rounded bg-black/60 px-3.5 py-1.5 border border-zinc-800 backdrop-blur-sm">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500/10" />
                            <span className="text-zinc-300 uppercase tracking-widest">1-Click Google Access</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* VIP Student Notification Desk Form */}
                    <div 
                      className="rounded-3xl border border-zinc-800 bg-[#0F0F0F]/80 p-6 md:p-8 relative overflow-hidden"
                      id="student_newsletter_signup"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-amber-500 hidden md:block select-none pointer-events-none">
                        <Mail className="h-44 w-44" />
                      </div>
                      <div className="max-w-xl">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-[10px] uppercase font-bold tracking-widest">
                          <Bell className="h-3 w-3 text-amber-500 animate-bounce" /> Broadcast Alerts Desk
                        </span>
                        <h3 className="text-lg font-serif italic text-white mt-3">
                          Never miss a chord substitution template
                        </h3>
                        <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                          Enter your email to join our newsletter list. Every time the academy instructor publishes new tutorials, videos, tabs or blog guides, you will receive an automatic email notification broadcast!
                        </p>
                        
                        <form onSubmit={handleSubscribe} className="mt-5 flex flex-col sm:flex-row gap-2.5 max-w-md">
                          <input
                            type="email"
                            required
                            value={subscriberEmail}
                            onChange={(e) => setSubscriberEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none transition-colors"
                          />
                          <button
                            type="submit"
                            disabled={subscribingStatus === 'loading'}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {subscribingStatus === 'loading' ? (
                              'Enlisting...'
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" /> Enlist in Alerts
                              </>
                            )}
                          </button>
                        </form>
                        
                        {subscribingStatus === 'success' && (
                          <p className="text-amber-500 font-mono text-[10px] mt-3 uppercase tracking-wider flex items-center gap-1.5 animate-fadeIn">
                            ✨ Enlist success! You will now receive automatic post broadcasts dynamically.
                          </p>
                        )}
                        {subscribingStatus === 'error' && (
                          <p className="text-red-500 font-mono text-[10px] mt-3 uppercase tracking-wider flex items-center gap-1.5">
                            ❌ Subscription error. Please check your network and try again.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Studio Dashboard Tab Selectors */}
                    <div className="grid grid-cols-4 gap-2 text-center" id="dashboard_genre_toggles">
                      {[
                        { id: 'all', label: 'All Materials', count: posts.length },
                        { id: 'lesson', label: 'Lessons 📚', count: posts.filter(p => !p.type || p.type === 'lesson').length },
                        { id: 'video', label: 'Videos 🎥', count: posts.filter(p => p.type === 'video' || (!p.type && p.videoUrl)).length },
                        { id: 'blog', label: 'Blogs ✍️', count: posts.filter(p => p.type === 'blog').length },
                      ].map((item) => {
                        const isSelected = selectedType === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => { setSelectedType(item.id as any); setSelectedCategory('All'); }}
                            className={`relative rounded-2xl border p-3.5 transition-all duration-300 cursor-pointer focus:outline-none ${
                              isSelected 
                                ? 'border-amber-500 bg-zinc-900/60 text-white shadow-xl shadow-amber-500/5' 
                                : 'border-zinc-805 bg-zinc-950/30 text-zinc-400 hover:text-white hover:border-zinc-700'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-0 left-0 h-0.5 w-full bg-amber-500" />
                            )}
                            <div className="text-lg mb-1 leading-none">
                              {item.id === 'all' ? '🎵' : item.id === 'lesson' ? '📚' : item.id === 'video' ? '🎥' : '✍️'}
                            </div>
                            <div className="text-[10px] sm:text-xs font-semibold tracking-tight truncate">{item.label}</div>
                            <div className="font-mono text-[8px] text-zinc-500 mt-0.5 uppercase tracking-widest">{item.count} items</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Index + Category Tags Panel filter */}
                    <div className="rounded-2xl border border-zinc-800 bg-[#0F0F0F] p-5 shadow-inner space-y-4" id="search_indexing_hub">
                      
                      {/* Search Bar Input */}
                      <div className="relative">
                        <Search className="absolute top-3.5 left-4.5 h-4 w-4 text-zinc-550" />
                        <input
                          type="text"
                          placeholder="Search chord progressions, scales, Afrobeats tabs, or tags..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full rounded-full border border-zinc-800 bg-zinc-950/40 py-3 pl-12 pr-4 text-xs text-zinc-200 placeholder-zinc-500 focus:border-amber-500/50 focus:bg-[#0A0A0A] focus:outline-none transition-all"
                        />
                      </div>

                      {/* Horizontal Scroll categories list */}
                      <div className="flex flex-wrap gap-1.5 items-center" id="category_tags_container">
                        <Filter className="h-3.5 w-3.5 text-zinc-500 mr-2" />
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all focus:outline-none ${
                              selectedCategory === cat
                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-800'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                    </div>

                    {/* Explore Grid list of post items */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em] pl-1">
                          Curriculum Modules ({filteredPosts.length})
                        </h3>
                        {selectedCategory !== 'All' && (
                          <button 
                            onClick={() => setSelectedCategory('All')} 
                            className="text-[10px] text-amber-500 uppercase tracking-widest font-extrabold hover:underline"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>

                      {filteredPosts.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center bg-zinc-950/50">
                          <Music className="mx-auto h-10 w-10 text-zinc-700" />
                          <h4 className="mt-4 text-sm font-serif italic text-zinc-300">No matching masterclass nodes found</h4>
                          <p className="mt-1 text-xs text-zinc-500">Simplify your keyword query or click clear filters above.</p>
                        </div>
                      ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" id="explore_grid_posts">
                          {filteredPosts.map((post) => (
                            <PostCard
                              key={post.postId}
                              post={post}
                              userLiked={likedPosts[post.postId] || false}
                              onLikeToggle={handleLikeToggle}
                              onSelect={(p) => setSelectedPost(p)}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Student Reviews & Testimonials Section */}
                    {reviews.length > 0 && (
                      <div className="rounded-3xl border border-zinc-800 bg-[#0F0F0F] p-8 space-y-6" id="student_reviews_section">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800 pb-4">
                          <div>
                            <h3 className="text-xl font-serif italic text-white flex items-center gap-2">
                              <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Student Testimonials
                            </h3>
                            <p className="text-xs text-zinc-500">Real feedback from guitarists who found their sound and owned their vibration.</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className="h-4 w-4 text-amber-500 fill-amber-500" />
                            ))}
                            <span className="text-xs font-mono font-bold text-zinc-400 ml-1.5 uppercase tracking-widest">4.9/5 Average rating</span>
                          </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          {reviews.map((rev) => (
                            <div key={rev.reviewId} className="rounded-2xl bg-zinc-950 p-5 border border-zinc-900 flex flex-col justify-between hover:border-zinc-800 transition-colors">
                              <div>
                                <div className="flex items-center gap-0.5 mb-3">
                                  {Array.from({ length: rev.rating }).map((_, i) => (
                                    <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
                                  ))}
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed italic font-light">
                                  "{rev.comment}"
                                </p>
                              </div>
                              <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px]">
                                <span className="font-bold text-zinc-400">{rev.name}</span>
                                <span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
                                  {rev.proficientLevel}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Low-bandwidth offline optimization disclaimer footer */}
                    <footer className="rounded-2xl bg-[#0F0F0F] p-8 text-center border border-zinc-800/60 max-w-7xl mx-auto space-y-2">
                      <p className="font-serif italic text-zinc-200">Vibration Guitar Academy</p>
                      <p className="font-mono text-[9px] leading-relaxed text-zinc-500 uppercase tracking-[0.25em]">
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
