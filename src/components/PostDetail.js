import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase.js';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, deleteDoc, setDoc } from 'firebase/firestore';
import { X, Play, FileText, Image as ImageIcon, Link, ArrowLeft, Heart, MessageSquare, Send, Trash2, Calendar, Share, Share2, ExternalLink } from 'lucide-react';

export default function PostDetail({ post, user, isAdmin, userLiked, onLikeToggle, onClose }) {
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const getPostUrl = () => {
    return `${window.location.origin}/#post-${post.postId}`;
  };

  const getShareText = () => {
    return `Check out this awesome guitar lesson: "${post.title}" 🎸 on Vibration Guitar Academy!`;
  };

  const handleShareClick = (platform) => {
    const postUrl = getPostUrl();
    const textMsg = `${getShareText()} ${postUrl}`;

    if (platform === 'whatsapp') {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`;
      window.open(waUrl, '_blank');
    } else if (platform === 'facebook') {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
      window.open(fbUrl, '_blank');
    } else if (platform === 'twitter') {
      const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}&url=${encodeURIComponent(postUrl)}`;
      window.open(twUrl, '_blank');
    } else if (platform === 'telegram') {
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(getShareText())}`;
      window.open(tgUrl, '_blank');
    } else if (platform === 'linkedin') {
      const lnUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
      window.open(lnUrl, '_blank');
    } else if (platform === 'email') {
      const mailUrl = `mailto:?subject=${encodeURIComponent(`Guitar Lesson: ${post.title}`)}&body=${encodeURIComponent(textMsg)}`;
      window.open(mailUrl, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(postUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Parse YouTube video ID and assemble highly robust embed links
  const getEmbedUrl = (url) => {
    try {
      if (!url) return '';
      if (url.includes('embed/')) return url;
      let videoId = '';
      if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1].split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    } catch {
      return '';
    }
  };

  const embedVideoUrl = post.videoUrl ? getEmbedUrl(post.videoUrl) : '';

  // Load comments in real-time from Firestore `/comments`
  useEffect(() => {
    const comPath = 'comments';
    const q = query(collection(db, comPath), where('postId', '==', post.postId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data(), commentId: doc.id });
      });
      // Sort in ascending order of timestamps (oldest first to tell discussion flows)
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setComments(items);
    }, (err) => {
      console.error('Firestore comments streaming error:', err);
    });

    return () => unsubscribe();
  }, [post.postId]);

  // Add Comment with custom anti-spam input sizing check
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please register or log in first to leave comments.');
      return;
    }
    if (!newCommentText.trim()) return;
    if (newCommentText.length > 500) {
      alert('Comment exceeds the maximum safe limit of 500 characters.');
      return;
    }

    setIsSubmittingComment(true);
    const commentPath = 'comments';
    try {
      const commentColl = collection(db, commentPath);
      const docRef = doc(commentColl);
      const payload = {
        commentId: docRef.id,
        postId: post.postId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous Student',
        userEmail: user.email || '',
        text: newCommentText.trim(),
        createdAt: new Date().toISOString()
      };

      // Create new comment record
      try {
        await setDoc(docRef, payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, commentPath);
      }

      // Update aggregate post comments counter atomically
      const postRef = doc(db, 'posts', post.postId);
      await updateDoc(postRef, {
        commentsCount: increment(1)
      });

      setNewCommentText('');
    } catch (err) {
      alert('Failed to post comment: ' + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment permanently?')) return;
    const path = `comments/${commentId}`;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      
      // Decrement commentsCount aggregate
      const postRef = doc(db, 'posts', post.postId);
      await updateDoc(postRef, {
        commentsCount: increment(-1)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Simplistic local markdown parser to style markdown text natively in HTML
  const renderMarkdown = (text) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} style={{ marginTop: '1.25rem', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('#### ')) {
        return <h5 key={idx} style={{ marginTop: '1rem', marginBottom: '0.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{line.replace('#### ', '')}</h5>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 'bold', fontFamily: 'var(--font-serif)', color: 'var(--text-main)' }}>{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} style={{ marginLeft: '1rem', listStyleType: 'disc', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{line.substring(2)}</li>;
      }
      if (line.startsWith('\`\`\`')) {
        return null;
      }
      // Check for code chords Block
      if (line.trim().startsWith('E|') || line.trim().startsWith('B|') || line.trim().startsWith('G|')) {
        return (
          <pre key={idx} style={{ margin: '0.5rem 0', padding: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--primary)', borderRadius: '0.5rem', overflowX: 'auto' }}>
            {line}
          </pre>
        );
      }
      return line.trim() === '' ? <div key={idx} style={{ height: '0.5rem' }} /> : <p key={idx} style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{line}</p>;
    });
  };

  return (
    <div className="card" id="post_detail_container" style={{ padding: 0 }}>
      {/* Detail view header with back button */}
      <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 1.5rem', backgroundColor: 'var(--bg-app)' }}>
        <button
          onClick={onClose}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit Lesson</span>
        </button>

        <span className="badge badge-beginner" style={{ fontWeight: 'bold' }}>
          {post.category}
        </span>
      </div>

      <div style={{ padding: '1.5rem' }}>
        {/* Core details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="flex-row" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Calendar className="h-4 w-4" />
            <span>Updated {new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginTop: '0.5rem', color: 'var(--text-main)' }}>
            {post.title}
          </h2>
        </div>

        {/* Responsive YouTube Player Embed */}
        {embedVideoUrl ? (
          <div style={{ borderRadius: '1rem', overflow: 'hidden', backgroundColor: '#000000', marginBottom: '2rem' }}>
            <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                title={post.title}
                src={embedVideoUrl}
                referrerPolicy="no-referrer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
            <div className="flex-row" style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#a1a1aa', backgroundColor: '#18181b' }}>
              <Play className="h-4 w-4 text-orange-500 fill-orange-500/10" />
              <span>Interactive Premium Academy Masterclass Stream</span>
            </div>
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border-color)', borderRadius: '1rem', marginBottom: '2rem' }}>
            <Play className="h-8 w-8 text-zinc-300" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Audio lesson content below</p>
          </div>
        )}

        {/* Grid: Lesson text and Material downloads */}
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 992 ? '2fr 1fr' : '1fr', gap: '1.5rem' }}>
          {/* Main Content Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Lesson Core Guide & Tabs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{renderMarkdown(post.content)}</div>
            </div>
          </div>

          {/* Practice files column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Interactive like button + stats counts */}
            <div className="card" style={{ backgroundColor: 'var(--bg-app)' }}>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Share & Support Course</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Love this lesson? Broadcast to WhatsApp groups & other socials!</p>

              <button
                onClick={() => onLikeToggle(post.postId)}
                className={`btn ${userLiked ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                <Heart className={`h-4 w-4 ${userLiked ? 'fill-current' : ''}`} />
                <span>{userLiked ? 'Lesson Saved' : 'Love Lesson'}</span>
              </button>

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1rem 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Direct Broadcast Shares</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleShareClick('whatsapp')}
                    className="btn btn-secondary btn-sm"
                    style={{ backgroundColor: '#10b981', color: '#ffffff' }}
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleShareClick('telegram')}
                    className="btn btn-secondary btn-sm"
                    style={{ backgroundColor: '#229ed9', color: '#ffffff' }}
                  >
                    Telegram
                  </button>
                  <button
                    onClick={() => handleShareClick('facebook')}
                    className="btn btn-secondary btn-sm"
                    style={{ backgroundColor: '#1877f2', color: '#ffffff' }}
                  >
                    Facebook
                  </button>
                  <button
                    onClick={() => handleShareClick('twitter')}
                    className="btn btn-secondary btn-sm"
                    style={{ backgroundColor: '#000000', color: '#ffffff' }}
                  >
                    Twitter / X
                  </button>
                </div>

                <button
                  onClick={() => handleShareClick('copy')}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.75rem' }}
                >
                  {copiedLink ? 'Copied Lesson Link ✅' : 'Copy Academy Link'}
                </button>
              </div>
            </div>

            {/* Downloads Block */}
            <div className="card">
              <h4 style={{ fontSize: '0.8125rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Downloadable Chord Worksheets
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {post.media && post.media.length > 0 ? (
                  post.media.map((file, i) => (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-between"
                      style={{ padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textDecoration: 'none', backgroundColor: 'var(--bg-app)' }}
                    >
                      <div className="flex-row">
                        {file.type === 'pdf' ? (
                          <FileText className="h-5 w-5" style={{ color: 'var(--red)' }} />
                        ) : (
                          <ImageIcon className="h-5 w-5" style={{ color: 'var(--blue)' }} />
                        )}
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {file.name}
                          </p>
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{file.type} download</span>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    </a>
                  ))
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    No downloadable worksheets added to this lesson.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Discussions Zone */}
        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '2rem' }} id="discussions_zone">
          <div style={{ maxWidth: '640px' }}>
            <h3 className="flex-row" style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>
              <MessageSquare className="h-5 w-5 text-orange-600" />
              <span>Lesson Discussions ({comments.length})</span>
            </h3>

            {/* List comments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }} id="discussions_list">
              {comments.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes posted yet. Be the first to start the discussion!</p>
              ) : (
                comments.map((com) => (
                  <div 
                    key={com.commentId}
                    className="flex-row"
                    style={{ alignItems: 'flex-start', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${com.userName}`}
                      style={{ h: '2rem', w: '2rem', borderRadius: '50%', backgroundColor: 'var(--border-color)' }}
                      alt="avatar"
                      width="32"
                      height="32"
                    />
                    <div style={{ flex: 1, marginLeft: '0.75rem' }}>
                      <div className="flex-between">
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{com.userName}</span>
                        <div className="flex-row" style={{ gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                            {new Date(com.createdAt).toLocaleDateString()}
                          </span>
                          {(isAdmin || (user && user.uid === com.userId)) && (
                            <button
                              onClick={() => handleDeleteComment(com.commentId)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              title="Delete Comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                           )}
                        </div>
                      </div>
                      <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{com.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Submit comment form */}
            {user ? (
              <form onSubmit={handleAddComment} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '2rem' }} id="comment_compose_form">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`}
                  style={{ borderRadius: '50%', border: '1px solid var(--border-color)' }}
                  alt="avatar"
                  width="32"
                  height="32"
                />
                <div style={{ flex: 1 }}>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Enter guitar practice questions or progression thoughts..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="form-control"
                    style={{ minHeight: '4.5rem' }}
                    required
                  />
                  <div className="flex-between" style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                      {newCommentText.length}/500 chars
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="btn btn-primary btn-sm"
                    >
                      <Send className="h-3 w-3" />
                      <span>Post comment</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div style={{ marginTop: '2rem', padding: '1rem', textAlign: 'center', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Please sign in above to ask questions or discuss notes with academy instructors.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
