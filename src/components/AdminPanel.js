import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase.js';
import { collection, setDoc, doc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { 
  BookOpen, Sparkles, Plus, Trash2, FileText, Image as ImageIcon, 
  Send, Loader2, CheckCircle, Eye, Star, Layers, Calendar, ClipboardList,
  UserCheck, UserMinus, ShieldAlert, Edit3, XCircle
} from 'lucide-react';

export default function AdminPanel({ 
  onPostPublished, 
  existingPosts, 
  onSelectPost,
  reviews = [],
  curriculum = []
}) {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState('lessons');

  // Edit/management form state
  const [editingPost, setEditingPost] = useState(null);

  // Registered students management state
  const [studentsList, setStudentsList] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Lessons Form States
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Beginner');
  const [postType, setPostType] = useState('lesson');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [attachType, setAttachType] = useState('pdf');

  // Student reviews Form States
  const [revName, setRevName] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revLevel, setRevLevel] = useState('Beginner');
  const [revComment, setRevComment] = useState('');
  const [isPublishingReview, setIsPublishingReview] = useState(false);

  // Curriculum Form States
  const [currLevel, setCurrLevel] = useState('Beginner');
  const [currTitle, setCurrTitle] = useState('');
  const [currDesc, setCurrDesc] = useState('');
  const [currPostId, setCurrPostId] = useState('');
  const [currOrder, setCurrOrder] = useState(1);
  const [isPublishingCurriculum, setIsPublishingCurriculum] = useState(false);
  const [editingCurriculumId, setEditingCurriculumId] = useState(null);

  // Loading and system notification banners
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(null);

  const categories = [
    'Beginner',
    'Intermediate',
    'Advanced'
  ];

  // Auto-generate Slug on-the-fly
  const handleTitleChange = (val) => {
    setTitle(val);
    setSlug(val.toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-'));
  };

  // Call express server-side Gemini AI content assistant!
  const handleAiSuggest = async () => {
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

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Publish Lesson Post
  const handlePublishPost = async (e) => {
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

        // Dispatch email notification alerts to all curriculum subscribers
        try {
          const subscribersSnap = await getDocs(collection(db, 'subscribers'));
          const subscriberEmails = [];
          subscribersSnap.forEach((doc) => {
            const data = doc.data();
            if (data && data.email) {
              subscriberEmails.push(data.email);
            }
          });

          if (subscriberEmails.length > 0) {
            console.log(`Dispatched automated notifications for "${title}" to ${subscriberEmails.length} subscribers.`);
            await fetch('/api/notify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                emails: subscriberEmails,
                postTitle: title,
                postPreview: content.length > 150 ? content.substring(0, 150) + '...' : content,
                postUrl: window.location.origin
              })
            });
          }
        } catch (notifErr) {
          console.error('Email subscriber notification failed to dispatch:', notifErr);
        }
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
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, postPath);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBeginEdit = (post) => {
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
      const list = [];
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
  const handleToggleUserRole = async (student) => {
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
    } catch (err) {
      console.error('Role change failure:', err);
      alert('Failed to change role: ' + err.message);
    }
  };

  // Suspend / unsuspend user account
  const handleToggleSuspension = async (student) => {
    const newSuspended = !student.suspended;
    const studentRef = doc(db, 'users', student.userId);
    try {
      await setDoc(studentRef, { suspended: newSuspended }, { merge: true });
      alert(`${student.name || 'Student'} account suspended status set to: ${newSuspended}`);
    } catch (err) {
      console.error('Suspension status change failure:', err);
      alert('Failed to change suspension: ' + err.message);
    }
  };

  // Delete user profile completely
  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you absolute sure you want to delete this student profile? This removes their record.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', studentId));
      alert('Student profile removed.');
    } catch (err) {
      console.error('Deletion operation failed:', err);
      alert('Failed to delete user profile: ' + err.message);
    }
  };

  const handleDeletePost = async (postId) => {
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

  const handlePublishReview = async (e) => {
    e.preventDefault();
    if (!revName || !revComment) {
      alert('Student name and comment is required.');
      return;
    }
    setIsPublishingReview(true);
    try {
      const docRef = doc(collection(db, 'reviews'));
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
      alert('Student review published successfully.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reviews');
    } finally {
      setIsPublishingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this class rating?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  const handleEditCurriculum = (item) => {
    setEditingCurriculumId(item.itemId);
    setCurrLevel(item.level || 'Beginner');
    setCurrTitle(item.title || '');
    setCurrDesc(item.description || '');
    setCurrPostId(item.postId || '');
    setCurrOrder(item.order || 1);
  };

  const handleCancelEditCurriculum = () => {
    setEditingCurriculumId(null);
    setCurrLevel('Beginner');
    setCurrTitle('');
    setCurrDesc('');
    setCurrPostId('');
    setCurrOrder(1);
  };

  const handlePublishCurriculum = async (e) => {
    e.preventDefault();
    if (!currTitle || !currDesc) {
      alert('Syllabus Title and short technical description are required.');
      return;
    }
    setIsPublishingCurriculum(true);
    try {
      if (editingCurriculumId) {
        const docRef = doc(db, 'curriculum', editingCurriculumId);
        await setDoc(docRef, {
          itemId: editingCurriculumId,
          level: currLevel,
          title: currTitle,
          description: currDesc,
          postId: currPostId || '',
          order: Number(currOrder) || 1,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setEditingCurriculumId(null);
        alert('Syllabus item updated successfully!');
      } else {
        const docRef = doc(collection(db, 'curriculum'));
        await setDoc(docRef, {
          itemId: docRef.id,
          level: currLevel,
          title: currTitle,
          description: currDesc,
          postId: currPostId || '',
          order: Number(currOrder) || 1,
          createdAt: new Date().toISOString()
        });
        alert('Syllabus item added successfully!');
      }
      setCurrTitle('');
      setCurrDesc('');
      setCurrPostId('');
      setCurrOrder(1);
    } catch (err) {
      handleFirestoreError(err, editingCurriculumId ? OperationType.UPDATE : OperationType.CREATE, 'curriculum');
    } finally {
      setIsPublishingCurriculum(false);
    }
  };

  const handleDeleteCurriculum = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this curriculum item?')) return;
    try {
      await deleteDoc(doc(db, 'curriculum', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `curriculum/${itemId}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} id="unified_admin_panel">
      
      {/* Tab Selectors */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('lessons')}
          className="btn"
          style={{
            borderBottom: activeTab === 'lessons' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'lessons' ? 'var(--primary)' : 'var(--text-muted)',
            borderRadius: 0, paddingBottom: '0.5rem'
          }}
        >
          📚 Lessons
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className="btn"
          style={{
            borderBottom: activeTab === 'reviews' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'reviews' ? 'var(--primary)' : 'var(--text-muted)',
            borderRadius: 0, paddingBottom: '0.5rem'
          }}
        >
          ⭐️ Reviews
        </button>
        <button
          onClick={() => setActiveTab('curriculum')}
          className="btn"
          style={{
            borderBottom: activeTab === 'curriculum' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'curriculum' ? 'var(--primary)' : 'var(--text-muted)',
            borderRadius: 0, paddingBottom: '0.5rem'
          }}
        >
          ⛓️ Syllabus
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className="btn"
          style={{
            borderBottom: activeTab === 'students' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'students' ? 'var(--primary)' : 'var(--text-muted)',
            borderRadius: 0, paddingBottom: '0.5rem'
          }}
        >
          👥 Students
        </button>
      </div>

      {activeTab === 'lessons' && (
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 992 ? '2fr 1fr' : '1fr', gap: '1.5rem' }} id="admin_dashboard">
          
          {/* Editor Panel Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} id="editor_parent_panel">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', fontFamily: 'var(--font-serif)' }}>
                    {editingPost ? `🖊️ Edit Lesson: ${editingPost.title}` : 'Publish Lesson Node'}
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Design rich-text tutorials, chords, and media embeds</p>
                </div>
                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={handleAiSuggest}
                  className="btn btn-primary btn-sm"
                >
                  {isAiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>{isAiLoading ? 'Gemini composing...' : '⚡ Generate tab with Gemini'}</span>
                </button>
              </div>

              <form onSubmit={handlePublishPost} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }} id="post_creation_form">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Lesson Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Master E-Minor Triads"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Content Type</label>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value)}
                      className="form-control"
                    >
                      <option value="lesson">📚 Academy Lesson</option>
                      <option value="video">🎥 Video Course</option>
                      <option value="blog">✍️ Editorial Blog</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Academy Level</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="form-control"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Slug Preview</label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    /lessons/{slug || 'untitled-lesson'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">YouTube Video Link (Optional)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://www.youtube.com/watch?v=A8g2WqX76q4"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Quick Video Presets</label>
                    <select 
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="form-control"
                    >
                      <option value="">-- Choose Preset Masterclass --</option>
                      <option value="https://www.youtube.com/embed/ZqL6p9LreX4">Afrobeat Guitar Chord Shapes</option>
                      <option value="https://www.youtube.com/embed/A8g2WqX76q4">Gospel Triads and Voicings</option>
                      <option value="https://www.youtube.com/embed/K81T7R9bZ2c">Ultimate Pentatonic Scale Masterclass</option>
                    </select>
                  </div>
                </div>

                {/* Attachments Section */}
                <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '1rem', backgroundColor: 'var(--bg-app)' }}>
                  <span className="form-label" style={{ marginBottom: '0.5rem' }}>Attach Downloadable PDF Tabs / Charts</span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="File label (e.g. Chord PDF)"
                      value={attachName}
                      onChange={(e) => setAttachName(e.target.value)}
                      className="form-control"
                    />
                    <input
                      type="text"
                      placeholder="Document URL"
                      value={attachUrl}
                      onChange={(e) => setAttachUrl(e.target.value)}
                      className="form-control"
                    />
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <select
                        value={attachType}
                        onChange={(e) => setAttachType(e.target.value)}
                        className="form-control"
                        style={{ flex: 1 }}
                      >
                        <option value="pdf">PDF Worksheet</option>
                        <option value="image">Fret Diagram</option>
                        <option value="link">Interactive Link</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddAttachment}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem' }}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Attachments list */}
                  {attachments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex-between animate-fade" style={{ background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                          <div className="flex-row">
                            {file.type === 'pdf' ? (
                              <FileText className="h-4 w-4 text-red-500" />
                            ) : file.type === 'image' ? (
                              <ImageIcon className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Plus className="h-4 w-4 text-emerald-505" />
                            )}
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rich text tutorial content */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Lesson Theory & Tabs (Markdown Supported)</label>
                  <textarea
                    rows={8}
                    placeholder="Compose the lesson theory, progression logs, rhythmic drills, and finger tab layouts..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="form-control"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', resize: 'vertical' }}
                    required
                  />
                </div>

                {/* Dispatch details alert banner */}
                {notifSuccess && (
                  <div className="flex-row" style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--emerald)', color: 'var(--emerald)', fontSize: '0.75rem' }}>
                    <CheckCircle className="h-4 w-4" />
                    <span>{notifSuccess}</span>
                  </div>
                )}

                <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
                  {editingPost && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn btn-secondary"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="btn btn-primary"
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>
                      {isPublishing 
                        ? (editingPost ? 'Saving...' : 'Publishing...') 
                        : (editingPost ? 'Save Lesson' : 'Publish Lesson')
                      }
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Existing Lessons Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} id="existing_lessons_sidebar">
            <div className="card">
              <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                Active School Material ({existingPosts.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }} id="lesson_list_scroll">
                {existingPosts.length === 0 ? (
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0' }}>No lessons created yet.</p>
                ) : (
                  existingPosts.map((post) => (
                    <div 
                      key={post.postId}
                      className="card animate-fade"
                      style={{ padding: '0.875rem' }}
                    >
                      <p style={{ fontSize: '0.8125rem', fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</p>
                      <div className="flex-between" style={{ marginTop: '0.5rem' }}>
                        <div className="flex-row" style={{ gap: '0.25rem' }}>
                          <span className="badge badge-intermediate" style={{ padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                            {post.type === 'video' ? '🎥 Video' : post.type === 'blog' ? '✍️ Blog' : '📚 Lesson'}
                          </span>
                          <span className="badge badge-beginner" style={{ padding: '0.125rem 0.375rem', fontSize: '0.625rem' }}>
                            {post.category}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.25rem', borderTop: '1px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '0.5rem' }}>
                        <button
                          onClick={() => onSelectPost(post)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem' }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleBeginEdit(post)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', color: 'var(--amber)' }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.postId)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', color: 'var(--red)' }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 992 ? '2fr 1fr' : '1fr', gap: '1.5rem' }} id="admin_reviews_section">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-main)' }}>Publish Testimonial</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Showcase student praise on the main academy presentation section</p>
              </div>

              <form onSubmit={handlePublishReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Student Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Emmanuel Adebayo"
                      value={revName}
                      onChange={(e) => setRevName(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Guitar Bracket</label>
                    <select
                      value={revLevel}
                      onChange={(e) => setRevLevel(e.target.value)}
                      className="form-control"
                    >
                      <option value="Beginner">Beginner Student</option>
                      <option value="Intermediate">Intermediate Student</option>
                      <option value="Advanced">Advanced Student</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: '0.5rem' }}>Rating score (1 to 5 Stars)</label>
                  <div className="flex-row" style={{ gap: '0.25rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRevRating(star)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        <Star 
                          className="h-6 w-6" 
                          style={{
                            color: 'var(--amber)',
                            fill: star <= revRating ? 'var(--amber)' : 'none'
                          }} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Review text content</label>
                  <textarea
                    rows={3}
                    placeholder="Description of student experience with worksheets, instructors and WhatsApp study flows..."
                    value={revComment}
                    onChange={(e) => setRevComment(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={isPublishingReview}
                    className="btn btn-primary"
                  >
                    {isPublishingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                    <span>Submit Review</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div>
            <div className="card">
              <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                Active Testimonials ({reviews.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                {reviews.length === 0 ? (
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0' }}>No reviews posted yet.</p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.reviewId} className="card animate-fade" style={{ padding: '0.75rem' }}>
                      <div className="flex-between">
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{rev.name}</span>
                        <div style={{ display: 'flex' }}>
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3" style={{ fill: 'var(--amber)', color: 'var(--amber)' }} />
                          ))}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>"{rev.comment}"</p>
                      <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="badge badge-beginner" style={{ fontSize: '0.625rem' }}>{rev.proficientLevel}</span>
                        <button
                          onClick={() => handleDeleteReview(rev.reviewId)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '0.6875rem', fontWeight: 'bold' }}
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
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 992 ? '2fr 1fr' : '1fr', gap: '1.5rem' }} id="admin_curriculum_section">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ border: editingCurriculumId ? '2px solid var(--primary)' : '1px solid var(--border-color)' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Layers className="h-5 w-5 text-orange-600" /> {editingCurriculumId ? 'Edit Syllabus Topic' : 'Syllabus Topic Configuration'}
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                    {editingCurriculumId ? 'Updating existing syllabus configuration point' : 'Align topics dynamically inside student course levels'}
                  </p>
                </div>
                {editingCurriculumId && (
                  <button 
                    onClick={handleCancelEditCurriculum}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handlePublishCurriculum} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Syllabus Class</label>
                    <select
                      value={currLevel}
                      onChange={(e) => setCurrLevel(e.target.value)}
                      className="form-control"
                    >
                      <option value="Beginner">Beginner Bracket</option>
                      <option value="Intermediate">Intermediate Bracket</option>
                      <option value="Advanced">Advanced Bracket</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Topic Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Master E-Minor Triad voicings shifts"
                      value={currTitle}
                      onChange={(e) => setCurrTitle(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Order index (1 to 99)</label>
                    <input
                      type="number"
                      value={currOrder}
                      onChange={(e) => setCurrOrder(Number(e.target.value) || 1)}
                      className="form-control"
                      required
                      min={1}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Link lesson (optional)</label>
                    <select
                      value={currPostId}
                      onChange={(e) => setCurrPostId(e.target.value)}
                      className="form-control"
                    >
                      <option value="">-- No linked lesson --</option>
                      {existingPosts.map((p) => (
                        <option key={p.postId} value={p.postId}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Short dynamic outline details</label>
                  <textarea
                    rows={3}
                    placeholder="Summarize visual chord shapes, key exercises, fret diagrams directions and targets..."
                    value={currDesc}
                    onChange={(e) => setCurrDesc(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
                  {editingCurriculumId && (
                    <button
                      type="button"
                      onClick={handleCancelEditCurriculum}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isPublishingCurriculum}
                    className="btn btn-primary"
                  >
                    {isPublishingCurriculum ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                    <span>{editingCurriculumId ? 'Save Syllabus Changes' : 'Add curriculum point'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div>
            <div className="card">
              <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                Syllabus Outline ({curriculum.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => {
                  const items = curriculum.filter(i => i.level === lvl);
                  return (
                    <div key={lvl} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                      <span className="badge badge-beginner" style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        {lvl} Bracket
                      </span>
                      {items.length === 0 ? (
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '0.5rem' }}>Empty outline list</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '0.25rem', marginTop: '0.25rem' }}>
                          {items.map((it) => (
                            <div key={it.itemId} className="card animate-fade" style={{ padding: '0.5rem 0.75rem', margin: 0, border: editingCurriculumId === it.itemId ? '1px solid var(--primary)' : '1px solid var(--border-color)' }}>
                              <div className="flex-between">
                                <div style={{ overflow: 'hidden', marginRight: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>#{it.order} </span>
                                  <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{it.title}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                  <button
                                    onClick={() => handleEditCurriculum(it)}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.625rem', fontWeight: 'bold' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCurriculum(it.itemId)}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '0.625rem', fontWeight: 'bold' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.3' }}>{it.description}</p>
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
        <div className="card" id="student_control_dashboard" style={{ padding: '1.5rem' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text-main)' }}>Student Access configuration</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configure student lists, promote/demote administrators, and revoke dashboard credentials.</p>
          </div>

          {isLoadingStudents ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '0.5rem' }}>
              <Loader2 className="h-8 w-8 text-orange-600 animate-spin" />
              <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Querying Student database...</p>
            </div>
          ) : studentsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No students registered in Firestore databases yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '1rem' }}>
              <table className="list-table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-app)' }}>
                    <th>Student Profile</th>
                    <th>Status</th>
                    <th>Permission Role</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsList.map((student) => {
                    const isSelf = student.email === 'mrclabutu@gmail.com'; // Master admin
                    return (
                      <tr key={student.userId}>
                        <td>
                          <div className="flex-row">
                            <img
                              src={student.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${student.name || 'Student'}`}
                              referrerPolicy="no-referrer"
                              style={{ height: '2.25rem', width: '2.25rem', borderRadius: '50%', border: '1px solid var(--border-color)' }}
                              alt="student avatar"
                            />
                            <div>
                              <p style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{student.name || 'Anonymous User'}</p>
                              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {student.suspended ? (
                            <span className="badge badge-advanced" style={{ fontSize: '0.625rem' }}>🚫 SUSPENDED</span>
                          ) : (
                            <span className="badge badge-beginner" style={{ fontSize: '0.625rem' }}>✅ ACTIVE</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-intermediate" style={{ fontSize: '0.625rem' }}>
                            🛡️ {student.role === 'admin' ? 'Elite Admin' : 'Student'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.375rem' }}>
                            <button
                              onClick={() => handleToggleUserRole(student)}
                              disabled={isSelf}
                              className="btn btn-secondary btn-sm"
                              style={{ opacity: isSelf ? 0.35 : 1 }}
                            >
                              <span>{student.role === 'admin' ? 'Demote' : 'Promote'}</span>
                            </button>

                            <button
                              onClick={() => handleToggleSuspension(student)}
                              disabled={isSelf}
                              className="btn btn-danger btn-sm"
                              style={{ opacity: isSelf ? 0.35 : 1, padding: '0.375rem 0.75rem' }}
                            >
                              <span>{student.suspended ? 'Restore' : 'Suspend'}</span>
                            </button>

                            <button
                              onClick={() => handleDeleteStudent(student.userId)}
                              disabled={isSelf}
                              className="btn btn-secondary btn-sm"
                              style={{ opacity: isSelf ? 0.35 : 1, padding: '0.375rem' }}
                              title="Delete profile"
                            >
                              <XCircle className="h-4 w-4" style={{ color: 'var(--red)' }} />
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
