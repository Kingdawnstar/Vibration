import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { 
  BookOpen, Sparkles, Plus, Trash2, FileText, Image as ImageIcon, 
  Send, Loader2, CheckCircle, Eye, Star, Layers, Calendar, ClipboardList,
  UserCheck, UserMinus, ShieldAlert, Edit3, XCircle
} from 'lucide-react';
import { Post, MediaAttachment, Review, CurriculumItem } from '../types';

interface AdminPanelProps {
  onPostPublished: () => void;
  existingPosts: Post[];
  onSelectPost: (post: Post) => void;
  reviews: Review[];
  curriculum: CurriculumItem[];
}

export default function AdminPanel({ 
  onPostPublished, 
  existingPosts, 
  onSelectPost,
  reviews,
  curriculum
}: AdminPanelProps) {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<'lessons' | 'reviews' | 'curriculum' | 'students'>('lessons');

  // Edit/management form state
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Registered students management state
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Lessons Form States
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Beginner');
  const [postType, setPostType] = useState<'lesson' | 'video' | 'blog'>('lesson');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  // Attachments state
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [attachType, setAttachType] = useState<'pdf' | 'image' | 'link'>('pdf');

  // Student reviews Form States
  const [revName, setRevName] = useState('');
  const [revRating, setRevRating] = useState<number>(5);
  const [revLevel, setRevLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [revComment, setRevComment] = useState('');
  const [isPublishingReview, setIsPublishingReview] = useState(false);

  // Curriculum Form States
  const [currLevel, setCurrLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [currTitle, setCurrTitle] = useState('');
  const [currDesc, setCurrDesc] = useState('');
  const [currPostId, setCurrPostId] = useState('');
  const [currOrder, setCurrOrder] = useState<number>(1);
  const [isPublishingCurriculum, setIsPublishingCurriculum] = useState(false);

  // Loading and system notification banners
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);

  const categories = [
    'Beginner',
    'Intermediate',
    'Advanced'
  ];

  // Auto-generate Slug on-the-fly
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(val.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-'));
  };

  // Call express server-side Gemini AI content assistant!
  const handleAiAssist = async () => {
    if (!title) {
      alert('Please specify a lesson title first to guide the AI assistant.');
      return;
    }
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category })
      });
      const data = await response.json();
      if (data.content) {
        setContent(data.content);
        // Pre-add a sample tab sheet attachment to enhance the post
        if (attachments.length === 0) {
          setAttachments([
            {
              name: `📊 [PDF Tabs] ${title} - Lesson Materials`,
              url: 'https://vibration-academy.com/assets/sheets/demo-lesson.pdf',
              type: 'pdf'
            }
          ]);
        }
      }
    } catch (e) {
      console.error(e);
      alert('AI assistant failed to produce content: ' + String(e));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddAttachment = () => {
    if (!attachName || !attachUrl) {
      alert('Please enter both name and URL for the attachment.');
      return;
    }
    setAttachments([...attachments, { name: attachName, url: attachUrl, type: attachType }]);
    setAttachName('');
    setAttachUrl('');
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Publish Lesson Post
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      alert('Title and Content are required.');
      return;
    }
    setIsPublishing(true);
    setNotifSuccess(null);

    const postPath = 'posts';
    try {
      if (editingPost) {
        const postRef = doc(db, 'posts', editingPost.postId);
        const updatedPostData = {
          postId: editingPost.postId,
          title,
          slug,
          category,
          type: postType,
          content,
          videoUrl: videoUrl || '',
          media: attachments,
          likesCount: editingPost.likesCount || 0,
          commentsCount: editingPost.commentsCount || 0,
          createdAt: editingPost.createdAt || new Date().toISOString()
        };
        await setDoc(postRef, updatedPostData);
        setNotifSuccess('Lesson updated successfully!');
        setEditingPost(null);
      } else {
        const timeString = new Date().toISOString();
        const docRef = doc(collection(db, postPath));
        const newPostData = {
          postId: docRef.id,
          title,
          slug,
          category,
          type: postType,
          content,
          videoUrl: videoUrl || '',
          media: attachments,
          likesCount: 0,
          commentsCount: 0,
          createdAt: timeString
        };

        // Add document with handleFirestoreError security mappings
        await setDoc(docRef, newPostData);
        setNotifSuccess('Lesson published successfully! Students have been notified.');
      }

      // Reset form on complete
      setTitle('');
      setSlug('');
      setCategory('Beginner');
      setPostType('lesson');
      setContent('');
      setVideoUrl('');
      setAttachments([]);
      setTimeout(() => setNotifSuccess(null), 8000);
      onPostPublished();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, postPath);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBeginEdit = (post: Post) => {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setCategory(post.category);
    setPostType(post.type || 'lesson');
    setContent(post.content);
    setVideoUrl(post.videoUrl || '');
    setAttachments(post.media || []);
    
    // Smooth scroll back to form
    const formElement = document.getElementById('unified_admin_panel');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setTitle('');
    setSlug('');
    setCategory('Beginner');
    setPostType('lesson');
    setContent('');
    setVideoUrl('');
    setAttachments([]);
  };

  // Real-time student listing listener
  useEffect(() => {
    if (activeTab !== 'students') return;

    setIsLoadingStudents(true);
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCol, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), userId: doc.id });
      });
      // Sort by email
      list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      setStudentsList(list);
      setIsLoadingStudents(false);
    }, (err) => {
      console.error('Failed to query users Firestore list:', err);
      setIsLoadingStudents(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  // Promote / demote role
  const handleToggleUserRole = async (student: any) => {
    const newRole = student.role === 'admin' ? 'user' : 'admin';
    const studentRef = doc(db, 'users', student.userId);
    try {
      await setDoc(studentRef, { role: newRole }, { merge: true });
      if (newRole === 'admin') {
        await setDoc(doc(db, 'admins', student.userId), { email: student.email });
      } else {
        await deleteDoc(doc(db, 'admins', student.userId));
      }
      alert(`${student.name || 'Student'} is now updated to: ${newRole}`);
    } catch (err: any) {
      console.error('Role change failure:', err);
      alert('Failed to change role: ' + err.message);
    }
  };

  // Suspend / unsuspend user account
  const handleToggleSuspension = async (student: any) => {
    const newSuspended = !student.suspended;
    const studentRef = doc(db, 'users', student.userId);
    try {
      await setDoc(studentRef, { suspended: newSuspended }, { merge: true });
      alert(`${student.name || 'Student'} account suspended status set to: ${newSuspended}`);
    } catch (err: any) {
      console.error('Suspension status change failure:', err);
      alert('Failed to change suspension: ' + err.message);
    }
  };

  // Delete user profile completely
  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('Are you absolute sure you want to delete this student profile? This removes their record.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', studentId));
      alert('Student profile removed.');
    } catch (err: any) {
      console.error('Deletion operation failed:', err);
      alert('Failed to delete user profile: ' + err.message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this lesson? This action is irreversible.')) {
      return;
    }
    const path = `posts/${postId}`;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Publish Student Review
  const handlePublishReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName || !revComment) {
      alert('Student Name and comment text are required.');
      return;
    }
    setIsPublishingReview(true);
    const reviewsPath = 'reviews';
    try {
      const docRef = doc(collection(db, reviewsPath));
      await setDoc(docRef, {
        reviewId: docRef.id,
        name: revName,
        rating: revRating,
        proficientLevel: revLevel,
        comment: revComment,
        createdAt: new Date().toISOString()
      });
      setRevName('');
      setRevComment('');
      setRevRating(5);
      alert('Student review published successfully to real-time reviews collection!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, reviewsPath);
    } finally {
      setIsPublishingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this class rating?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  // Publish Curriculum Item
  const handlePublishCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currTitle || !currDesc) {
      alert('Syllabus Title and short technical description are required.');
      return;
    }
    setIsPublishingCurriculum(true);
    const currPath = 'curriculum';
    try {
      const docRef = doc(collection(db, currPath));
      await setDoc(docRef, {
        itemId: docRef.id,
        level: currLevel,
        title: currTitle,
        description: currDesc,
        postId: currPostId || '',
        order: Number(currOrder) || 1,
        createdAt: new Date().toISOString()
      });
      setCurrTitle('');
      setCurrDesc('');
      setCurrPostId('');
      setCurrOrder(1);
      alert('Structured curriculum syllabus topic successfully added to the real-time outline!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, currPath);
    } finally {
      setIsPublishingCurriculum(false);
    }
  };

  const handleDeleteCurriculum = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this curriculum item?')) return;
    try {
      await deleteDoc(doc(db, 'curriculum', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `curriculum/${itemId}`);
    }
  };

  return (
    <div className="space-y-6" id="unified_admin_panel">
      
      {/* Tab Selectors */}
      <div className="flex border-b border-zinc-800 pb-px gap-2">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'lessons' 
              ? 'border-amber-500 text-amber-500 bg-amber-500/5' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          📚 Academy Lessons
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'reviews' 
              ? 'border-amber-500 text-amber-500 bg-amber-500/5' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          ⭐️ Student Reviews
        </button>
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'curriculum' 
              ? 'border-amber-500 text-amber-500 bg-amber-500/5' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          ⛓️ Interactive Syllabus
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'students' 
              ? 'border-amber-500 text-amber-500 bg-amber-500/5' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          👥 Student Control
        </button>
      </div>

      {activeTab === 'lessons' && (
        <div className="grid gap-8 lg:grid-cols-3" id="admin_dashboard">
          
          {/* Editor Panel Column */}
          <div className="lg:col-span-2 space-y-6" id="editor_parent_panel">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-serif italic text-white font-semibold">
                    {editingPost ? `🖊️ Edit Academy Lesson: ${editingPost.title}` : 'Publish Academy Lesson Node'}
                  </h2>
                  <p className="text-xs text-zinc-400">Design rich-text tutorials, tabs, chord sheets, and media embeds</p>
                </div>
                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={handleAiAssist}
                  className="flex items-center space-x-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {isAiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>{isAiLoading ? 'Gemini composing...' : '⚡ Generate content with Gemini AI'}</span>
                </button>
              </div>

              <form onSubmit={handlePublishPost} className="mt-6 space-y-5" id="post_creation_form">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Lesson Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Master E-Minor Triads"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Content Type</label>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value as any)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="lesson">📚 Academy Lesson</option>
                      <option value="video">🎥 Video Course</option>
                      <option value="blog">✍️ Editorial Blog</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Academy Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase">Slug Preview</label>
                  <span className="mt-1 block font-mono text-[11px] text-zinc-500">
                    /lessons/{slug || 'untitled-lesson'}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">YouTube Video Link (Optional)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-zinc-500">Supports standard YouTube URLs or share-links</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Quick Mock Video Selector</label>
                    <select 
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-400 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Choose interactive standard lesson --</option>
                      <option value="https://www.youtube.com/embed/ZqL6p9LreX4">Afrobeat Guitar Chord Shapes</option>
                      <option value="https://www.youtube.com/embed/A8g2WqX76q4">Gospel Triads and Voicings</option>
                      <option value="https://www.youtube.com/embed/K81T7R9bZ2c">Ultimate Pentatonic Scale Masterclass</option>
                    </select>
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4">
                  <span className="block text-xs font-semibold text-zinc-400 uppercase mb-3">Attach Downloadable Tabs / Worksheets</span>
                  
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      placeholder="File label (e.g. Pentatonic Tabs PDF)"
                      value={attachName}
                      onChange={(e) => setAttachName(e.target.value)}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Document URL (e.g. s3/pdf-tabs.pdf)"
                      value={attachUrl}
                      onChange={(e) => setAttachUrl(e.target.value)}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex space-x-2">
                      <select
                        value={attachType}
                        onChange={(e) => setAttachType(e.target.value as any)}
                        className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="pdf">PDF Worksheet</option>
                        <option value="image">Fret Diagram</option>
                        <option value="link">Interactive Link</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddAttachment}
                        className="flex items-center justify-center rounded-lg bg-amber-500 px-3 text-black transition-colors hover:bg-amber-400"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Attachments list */}
                  {attachments.length > 0 && (
                    <div className="mt-3.5 space-y-1.5 border-t border-zinc-800/60 pt-3">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-1.5">
                          <div className="flex items-center space-x-2">
                            {file.type === 'pdf' ? (
                              <FileText className="h-3.5 w-3.5 text-red-500" />
                            ) : file.type === 'image' ? (
                              <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Plus className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                            <span className="font-sans text-xs font-semibold text-zinc-300">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="text-zinc-550 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rich text tutorial content */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Lesson Tutorial Content (Markdown Support)</label>
                  <textarea
                    rows={9}
                    placeholder="Compose the lesson theory, chord progressions, rhythmic loops and practice guides here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Dispatch details alert banner */}
                {notifSuccess && (
                  <div className="flex items-center space-x-2 rounded-xl bg-emerald-950/40 border border-emerald-900 px-4 py-3 text-emerald-400 animate-fadeIn">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-505 shrink-0" />
                    <span className="text-xs font-medium">{notifSuccess}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-2">
                  {editingPost && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex items-center space-x-1.5 rounded-xl bg-zinc-850 border border-zinc-700 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-zinc-750 transition-all cursor-pointer"
                    >
                      <span>Cancel Edit</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="flex items-center space-x-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-3 text-xs font-black uppercase tracking-wider text-black transition-all disabled:opacity-55 cursor-pointer"
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>
                      {isPublishing 
                        ? (editingPost ? 'Saving changes...' : 'Publishing lesson...') 
                        : (editingPost ? '💾 Save Changes' : '🚀 Publish Academy Lesson')
                      }
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Existing Lessons Controls Column */}
          <div className="space-y-6" id="existing_lessons_sidebar">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-white border-b border-zinc-800 pb-3 uppercase tracking-wider">
                Active Academy Material ({existingPosts.length})
              </h3>
              
              <div className="mt-4 space-y-3 max-h-[640px] overflow-y-auto" id="lesson_list_scroll">
                {existingPosts.length === 0 ? (
                  <p className="py-8 text-center text-xs text-zinc-550">No lessons created yet.</p>
                ) : (
                  existingPosts.map((post) => (
                    <div 
                      key={post.postId}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 transition-borderColor hover:border-zinc-700"
                    >
                      <p className="text-xs font-bold text-zinc-200 line-clamp-1 truncate">{post.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 justify-between">
                        <div className="flex gap-1 items-center">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-zinc-300">
                            {post.type === 'video' ? '🎥 Video' : post.type === 'blog' ? '✍️ Blog' : '📚 Lesson'}
                          </span>
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-400 border border-amber-500/15">
                            {post.category}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-zinc-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-end space-x-2 border-t border-zinc-850 pt-2.5">
                        <button
                          onClick={() => onSelectPost(post)}
                          className="flex items-center space-x-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-350 hover:text-white cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => handleBeginEdit(post)}
                          className="flex items-center space-x-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.postId)}
                          className="flex items-center space-x-1 rounded bg-red-950/30 border border-red-900/40 px-2 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-950/60 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="grid gap-8 lg:grid-cols-3" id="admin_reviews_section">
          
          {/* New Review form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <div className="border-b border-zinc-800 pb-4 mb-5">
                <h2 className="text-lg font-serif italic text-white font-semibold">Post Student Testimonial Review</h2>
                <p className="text-xs text-zinc-400">Add reviews manually from students to showcase on the home social proof section</p>
              </div>

              <form onSubmit={handlePublishReview} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Student Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Emmanuel Adebayo"
                      value={revName}
                      onChange={(e) => setRevName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Guitar Level</label>
                    <select
                      value={revLevel}
                      onChange={(e) => setRevLevel(e.target.value as any)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Beginner">Beginner Student</option>
                      <option value="Intermediate">Intermediate Student</option>
                      <option value="Advanced">Advanced Student</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Star Rating (1 to 5 Stars)</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRevRating(star)}
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star 
                          className={`h-6 w-6 ${
                            star <= revRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Review Testimonial Text</label>
                  <textarea
                    rows={4}
                    placeholder="e.g. This academy layout is clean, the chord worksheets saved me hours of rehearsal..."
                    value={revComment}
                    onChange={(e) => setRevComment(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPublishingReview}
                    className="flex items-center space-x-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPublishingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                    <span>Submit Testimonial</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Review items checklist */}
          <div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-white border-b border-zinc-800 pb-3 uppercase tracking-wider mb-4">
                Active Testimonials ({reviews.length})
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {reviews.length === 0 ? (
                  <p className="py-8 text-center text-xs text-zinc-550">No reviews posted yet.</p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.reviewId} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-250 truncate">{rev.name}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 italic line-clamp-2">"{rev.comment}"</p>
                      <div className="flex items-center justify-between border-t border-zinc-900 pt-2 text-[10px]">
                        <span className="text-amber-550 uppercase font-mono tracking-wider">{rev.proficientLevel}</span>
                        <button
                          onClick={() => handleDeleteReview(rev.reviewId)}
                          className="text-red-400 hover:text-red-500 font-bold uppercase tracking-wider"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="grid gap-8 lg:grid-cols-3" id="admin_curriculum_section">
          
          {/* Create form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <div className="border-b border-zinc-800 pb-4 mb-5">
                <h2 className="text-lg font-serif italic text-white font-semibold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-500" /> Define Curriculum Topic Outline
                </h2>
                <p className="text-xs text-zinc-400">Structurally align tasks and courses sequentially into beginner, intermediate, or advanced brackets</p>
              </div>

              <form onSubmit={handlePublishCurriculum} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Syllabus Bracket</label>
                    <select
                      value={currLevel}
                      onChange={(e) => setCurrLevel(e.target.value as any)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Beginner">Beginner Class</option>
                      <option value="Intermediate">Intermediate Class</option>
                      <option value="Advanced">Advanced Class</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Topic Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Master smooth gospel triads shift"
                      value={currTitle}
                      onChange={(e) => setCurrTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Display Priority Order (1-99)</label>
                    <input
                      type="number"
                      value={currOrder}
                      onChange={(e) => setCurrOrder(Number(e.target.value) || 1)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      required
                      min={1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase">Linked Masterclass Post (Optional)</label>
                    <select
                      value={currPostId}
                      onChange={(e) => setCurrPostId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-300 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- No Linked Post --</option>
                      {existingPosts.map((p) => (
                        <option key={p.postId} value={p.postId}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Short Technical Description Goals</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Learn to shift from C to F major utilizing top 3 strings syncopation routines..."
                    value={currDesc}
                    onChange={(e) => setCurrDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPublishingCurriculum}
                    className="flex items-center space-x-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPublishingCurriculum ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                    <span>Add Syllabus Topic</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Curriculum outline checklist */}
          <div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-white border-b border-zinc-800 pb-3 uppercase tracking-wider mb-4">
                Syllabus Topics Outline ({curriculum.length})
              </h3>

              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => {
                  const items = curriculum.filter(i => i.level === lvl);
                  return (
                    <div key={lvl} className="space-y-2 border-b border-zinc-800/40 pb-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                        {lvl} Level
                      </span>
                      {items.length === 0 ? (
                        <p className="text-[10px] text-zinc-650 italic pl-1">No items created.</p>
                      ) : (
                        <div className="space-y-2 pl-1">
                          {items.map((it) => (
                            <div key={it.itemId} className="text-xs bg-zinc-950/60 p-2.5 rounded border border-zinc-850 flex items-start justify-between gap-1.5">
                              <div>
                                <span className="font-mono text-[9px] text-zinc-500 mr-1.5 bg-zinc-800 px-1 py-0.5 rounded">#{it.order}</span>
                                <span className="font-serif italic text-zinc-200">{it.title}</span>
                                <p className="text-[10px] text-zinc-400 mt-1 leading-normal">{it.description}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteCurriculum(it.itemId)}
                                className="text-[9px] font-black uppercase text-red-400 hover:text-red-500 text-right shrink-0"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'students' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm" id="student_control_dashboard">
          <div className="border-b border-zinc-800 pb-4 mb-6">
            <h2 className="text-lg font-serif italic text-white font-semibold">Registered Student Registry & Permission Matrix</h2>
            <p className="text-xs text-zinc-400">Manage student access, promote/demote academy administrators, and control account suspension states.</p>
          </div>

          {isLoadingStudents ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Querying Student Registry...</p>
            </div>
          ) : studentsList.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm font-semibold text-zinc-500">No student profiles registered in Firestore yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
              <table className="w-full text-left text-xs text-zinc-400">
                <thead className="bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-5 py-4">Student Profile</th>
                    <th className="px-5 py-4">Auth UID & Status</th>
                    <th className="px-5 py-4">Permission Role</th>
                    <th className="px-5 py-4 text-right">Administrative Interventions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {studentsList.map((student) => {
                    const isSelf = student.email === 'mrclabutu@gmail.com'; // Master admin
                    return (
                      <tr key={student.userId} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={student.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${student.name || 'Student'}`}
                              referrerPolicy="no-referrer"
                              className="h-9 w-9 rounded-full border border-zinc-800"
                              alt="student photo"
                            />
                            <div>
                              <p className="font-bold text-zinc-100">{student.name || 'Anonymous User'}</p>
                              <p className="text-[11px] font-mono text-zinc-450">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span className="font-mono text-[9px] block text-zinc-550">{student.userId}</span>
                            {student.suspended ? (
                              <span className="inline-flex items-center rounded-md bg-red-900/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400 border border-red-500/10">
                                🚫 SUSPENDED
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-emerald-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/10 animate-pulse">
                                ✅ ACTIVE ACCOUNT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${
                            student.role === 'admin' 
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                          }`}>
                            🛡️ {student.role === 'admin' ? 'Elite Admin' : 'Student'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Role toggler */}
                            <button
                              onClick={() => handleToggleUserRole(student)}
                              disabled={isSelf}
                              className={`inline-flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase transition-all ${
                                isSelf 
                                  ? 'bg-zinc-850 text-zinc-600 cursor-not-allowed'
                                  : student.role === 'admin'
                                    ? 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-70 transition-colors cursor-pointer'
                                    : 'bg-amber-500/15 text-amber-500 hover:bg-amber-500 hover:text-black transition-colors cursor-pointer'
                              }`}
                              title={student.role === 'admin' ? 'Demote to Student' : 'Promote to Admin'}
                            >
                              <UserCheck className="h-3 w-3" />
                              <span>{student.role === 'admin' ? 'Demote' : 'Promote'}</span>
                            </button>

                            {/* Suspend toggler */}
                            <button
                              onClick={() => handleToggleSuspension(student)}
                              disabled={isSelf}
                              className={`inline-flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                                isSelf
                                  ? 'bg-zinc-850 text-zinc-600 cursor-not-allowed'
                                  : student.suspended
                                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-black cursor-pointer'
                                    : 'bg-red-500/15 text-red-400 hover:bg-red-550 hover:text-white cursor-pointer'
                              }`}
                              title={student.suspended ? 'Reactative User Account' : 'Suspend User Account'}
                            >
                              {student.suspended ? <UserCheck className="h-3 w-3" /> : <UserMinus className="h-3 w-3" />}
                              <span>{student.suspended ? 'Restore' : 'Suspend'}</span>
                            </button>

                            {/* Delete profile */}
                            <button
                              onClick={() => handleDeleteStudent(student.userId)}
                              disabled={isSelf}
                              className={`inline-flex items-center rounded-lg p-1.5 text-zinc-550 hover:text-red-500 transition-colors ${
                                isSelf ? 'opacity-20 cursor-not-allowed hover:text-zinc-550' : 'cursor-pointer'
                              }`}
                              title="Delete Record Profile"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
