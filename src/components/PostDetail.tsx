import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, deleteDoc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Post, Comment, MediaAttachment } from '../types';
import { X, Play, FileText, Image as ImageIcon, Link, ArrowLeft, Heart, MessageSquare, Send, Trash2, Calendar, Share, Share2, ExternalLink } from 'lucide-react';

interface PostDetailProps {
  post: Post;
  user: User | null;
  isAdmin: boolean;
  userLiked: boolean;
  onLikeToggle: (postId: string) => void;
  onClose: () => void;
}

export default function PostDetail({ post, user, isAdmin, userLiked, onLikeToggle, onClose }: PostDetailProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const getPostUrl = () => {
    return `${window.location.origin}/#post-${post.postId}`;
  };

  const getShareText = () => {
    return `Check out this awesome guitar lesson: "${post.title}" 🎸 on Vibration Guitar Academy!`;
  };

  const handleShareClick = (platform: 'whatsapp' | 'facebook' | 'twitter' | 'telegram' | 'linkedin' | 'email' | 'copy') => {
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
  const getEmbedUrl = (url: string) => {
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
      const items: Comment[] = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data() as Comment, commentId: doc.id });
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
  const handleAddComment = async (e: React.FormEvent) => {
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
      const payload: Comment = {
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
    } catch (err: any) {
      alert('Failed to post comment: ' + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
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
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="mt-5 text-sm font-bold text-zinc-950 uppercase tracking-wide">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('#### ')) {
        return <h5 key={idx} className="mt-4 text-xs font-bold text-orange-600 uppercase tracking-wider">{line.replace('#### ', '')}</h5>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="mt-6 text-base font-bold text-zinc-950">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="ml-4 list-disc text-xs text-zinc-700 mt-1">{line.substring(2)}</li>;
      }
      if (line.startsWith('\`\`\`')) {
        return null; // wrap tab fields cleanly
      }
      // Check for code chords Block
      if (line.trim().startsWith('E|') || line.trim().startsWith('B|') || line.trim().startsWith('G|')) {
        return (
          <pre key={idx} className="my-1.5 overflow-x-auto rounded-lg bg-zinc-950 px-3 py-1.5 font-mono text-[11px] font-medium leading-relaxed tracking-wider text-orange-400 border border-zinc-800">
            {line}
          </pre>
        );
      }
      return line.trim() === '' ? <div key={idx} className="h-2" /> : <p key={idx} className="text-xs leading-relaxed text-zinc-600 mt-1.5">{line}</p>;
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-lg overflow-hidden animate-fadeIn" id="post_detail_container">
      
      {/* Detail view header with back button */}
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/55 px-4 py-3.5 sm:px-6">
        <button
          onClick={onClose}
          className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit Lesson</span>
        </button>

        <span className="font-mono text-[10px] tracking-widest text-orange-600 uppercase font-bold">
          {post.category}
        </span>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Core details */}
        <div>
          <div className="flex items-center space-x-2 font-mono text-[10px] text-zinc-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>Updated {new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
          <h2 className="mt-3.5 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl lg:text-3xl">
            {post.title}
          </h2>
        </div>

        {/* Responsive YouTube Player Embed */}
        {embedVideoUrl ? (
          <div className="overflow-hidden rounded-2xl bg-zinc-950 shadow-md">
            <div className="aspect-video w-full">
              <iframe
                title={post.title}
                src={embedVideoUrl}
                referrerPolicy="no-referrer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
            <div className="flex items-center space-x-2 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-400">
              <Play className="h-3.5 w-3.5 text-orange-500 fill-orange-500/10" />
              <span>Interactive Premium Academy Masterclass Stream</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 py-10 text-center">
            <Play className="h-8 w-8 text-zinc-300" />
            <p className="mt-2 text-xs font-medium text-zinc-500">Audio lesson content below</p>
          </div>
        )}

        {/* Grid: Lesson text and Material downloads */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="prose prose-sm prose-orange max-w-none">
              <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Lesson Core Guide & Tabs</h3>
                <div className="space-y-1">{renderMarkdown(post.content)}</div>
              </div>
            </div>
          </div>

          {/* Practice files column */}
          <div className="space-y-6">
            
            {/* Interactive like button + stats counts */}
            <div className="rounded-2xl bg-orange-50/55 p-5 border border-orange-100/40 space-y-4">
              <div>
                <h4 className="text-[11px] font-bold text-orange-850 uppercase tracking-widest">Share & Support Course</h4>
                <p className="mt-1 text-[11px] text-zinc-500">Love this lesson? Broadcast to WhatsApp groups & other socials!</p>
              </div>

              <button
                onClick={() => onLikeToggle(post.postId)}
                className={`flex w-full items-center justify-center space-x-2 rounded-xl py-3 text-xs font-bold transition-all cursor-pointer ${
                  userLiked 
                    ? 'bg-red-650 text-white shadow-md shadow-red-500/20 hover:bg-red-700' 
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <Heart className={`h-4 w-4 ${userLiked ? 'fill-current text-white' : ''}`} />
                <span>{userLiked ? 'Lesson Saved' : 'Love Lesson'}</span>
              </button>

              <hr className="border-orange-100/40" />

              <div className="space-y-2">
                <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">Direct Broadcast Shares</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleShareClick('whatsapp')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2 font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleShareClick('telegram')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white py-2 font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    Telegram
                  </button>
                  <button
                    onClick={() => handleShareClick('facebook')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white py-2 font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    Facebook
                  </button>
                  <button
                    onClick={() => handleShareClick('twitter')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0F0F0F] hover:bg-zinc-800 text-white py-2 font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    Twitter / X
                  </button>
                  <button
                    onClick={() => handleShareClick('linkedin')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white py-2 font-bold text-[10px] transition-colors cursor-pointer animate-fadeIn"
                  >
                    LinkedIn
                  </button>
                  <button
                    onClick={() => handleShareClick('email')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-red-650 hover:bg-red-600 text-white py-2 font-bold text-[10px] transition-colors cursor-pointer animate-fadeIn"
                  >
                    Email
                  </button>
                </div>

                <button
                  onClick={() => handleShareClick('copy')}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-2.5 font-bold text-[10px] transition-colors cursor-pointer"
                >
                  {copiedLink ? 'Copied Lesson Link ✅' : 'Copy Academy Link'}
                </button>
              </div>
            </div>

            {/* Downloads Block */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-100 pb-3 uppercase tracking-wider">
                Downloadable Chord Worksheets
              </h4>
              
              <div className="mt-4 space-y-3">
                {post.media && post.media.length > 0 ? (
                  post.media.map((file, i) => (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/30 p-3 hover:bg-orange-50/20 hover:border-orange-200/40"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                          {file.type === 'pdf' ? (
                            <FileText className="h-4.5 w-4.5 text-red-500" />
                          ) : (
                            <ImageIcon className="h-4.5 w-4.5 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-zinc-800 line-clamp-1 group-hover:text-orange-700">
                            {file.name}
                          </p>
                          <span className="font-mono text-[9px] text-zinc-400 capitalize">{file.type} download</span>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-zinc-300 group-hover:text-orange-500" />
                    </a>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-zinc-400">
                    No downloadable worksheets added to this lesson nodes.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Discussions Zone */}
        <div className="border-t border-zinc-100 pt-8" id="discussions_zone">
          <div className="max-w-2xl">
            <h3 className="text-base font-bold text-zinc-950 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              <span>Lesson Discussions ({comments.length})</span>
            </h3>

            {/* List comments */}
            <div className="mt-6 space-y-4" id="discussions_list">
              {comments.length === 0 ? (
                <p className="py-4 text-xs text-zinc-400 italic">No notes posted yet. Be the first to start the discussion!</p>
              ) : (
                comments.map((com) => (
                  <div 
                    key={com.commentId}
                    className="flex space-x-3 rounded-xl border border-zinc-50/70 bg-zinc-50/30 p-3.5"
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${com.userName}`}
                      className="h-8 w-8 rounded-full bg-zinc-200 border border-zinc-100"
                      alt="avatar"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800">{com.userName}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[9px] text-zinc-400">
                            {new Date(com.createdAt).toLocaleDateString()}
                          </span>
                          {(isAdmin || (user && user.uid === com.userId)) && (
                            <button
                              onClick={() => handleDeleteComment(com.commentId)}
                              className="text-zinc-400 hover:text-red-500"
                              title="Delete Comment"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600 leading-relaxed">{com.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Submit comment form */}
            {user ? (
              <form onSubmit={handleAddComment} className="mt-6 flex items-start space-x-3" id="comment_compose_form">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`}
                  className="h-8 w-8 rounded-full border border-zinc-200"
                  alt="avatar"
                />
                <div className="flex-1">
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Enter guitar practice questions or progression thoughts..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 p-3 text-xs text-zinc-800 focus:border-orange-500 focus:outline-none"
                    required
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="font-mono text-[9px] text-zinc-400">
                      {newCommentText.length}/500 chars (antispam safe)
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="inline-flex items-center space-x-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-850"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Post comment</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-xl bg-zinc-50 p-4 text-center border border-zinc-100">
                <p className="text-xs text-zinc-500">
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
