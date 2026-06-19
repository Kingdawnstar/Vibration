import React, { useState } from 'react';
import { Share2, Heart, MessageSquare, ExternalLink, Calendar, BookOpen, Check, PlayCircle, FileText } from 'lucide-react';

export default function PostCard({ post, userLiked, onLikeToggle, onSelect }) {
  const [showShareDrawer, setShowShareDrawer] = useState(false);
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

  return (
    <article 
      className="post-card"
      id={`post_card_${post.postId}`}
    >
      {/* Category & Type Indicator Tags */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="badge badge-beginner" style={{ color: '#ffffff', backgroundColor: 'var(--primary)' }}>
          {post.category}
        </span>
        <span className="badge badge-intermediate" style={{ color: '#ffffff', backgroundColor: '#18181b', border: '1px solid var(--border-color)' }}>
          {post.type === 'video' ? '🎥 Video' : post.type === 'blog' ? '✍️ Blog' : '📚 Lesson'}
        </span>
      </div>

      {/* Decorative Waveform Header matching post type */}
      <div className="post-card-banner">
        {post.type === 'video' ? (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <PlayCircle className="h-10 w-10" style={{ color: 'var(--primary)', margin: '0 auto' }} />
            <p style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Video Masterclass</p>
          </div>
        ) : post.type === 'blog' ? (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <FileText className="h-10 w-10" style={{ color: '#10b981', margin: '0 auto' }} />
            <p style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Editorial Blog</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <BookOpen className="h-10 w-10" style={{ color: 'var(--primary)', margin: '0 auto' }} />
            <p style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Interactive Lesson</p>
          </div>
        )}
      </div>

      {/* Card Content body */}
      <div className="post-card-content">
        <div className="flex-row" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          <Calendar className="h-3.5 w-3.5" />
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>

        <h3 
          onClick={() => onSelect(post)}
          className="post-card-title"
          style={{ color: 'var(--text-main)' }}
        >
          {post.title}
        </h3>

        <p className="post-card-summary">
          {post.content ? post.content.replace(/[#`*_-]/g, '') : ''}
        </p>

        {/* Attachment summary counter */}
        {post.media && post.media.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center' }}>
            <span className="badge badge-beginner" style={{ fontWeight: 'bold' }}>
              📂 includes {post.media.length} files
            </span>
          </div>
        )}

        {/* Social interactions and actions footer */}
        <div className="flex-between" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="flex-row" style={{ gap: '1rem' }}>
            {/* Likes */}
            <button
              onClick={() => onLikeToggle(post.postId)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: userLiked ? 'var(--red)' : 'var(--text-muted)', fontWeight: 'bold' }}
            >
              <Heart className="h-4 w-4" style={{ fill: userLiked ? 'currentColor' : 'none' }} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{post.likesCount || 0}</span>
            </button>

            {/* Comments count */}
            <button 
              onClick={() => onSelect(post)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}
            >
              <MessageSquare className="h-4 w-4" />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{post.commentsCount || 0}</span>
            </button>
          </div>

          <div className="flex-row" style={{ gap: '0.25rem' }}>
            <button
              onClick={() => setShowShareDrawer(!showShareDrawer)}
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: '50%', padding: '0.375rem', border: 'none' }}
              title="Share Lesson"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => onSelect(post)}
              className="btn btn-primary btn-sm"
            >
              <span>Learn</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Quick Share Overlay Drawer */}
        {showShareDrawer && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }} className="animate-fade">
            <p style={{ fontSize: '0.625rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Broadcast Course</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              
              <button
                onClick={() => handleShareClick('whatsapp')}
                className="btn btn-secondary btn-sm"
                style={{ backgroundColor: '#10b981', color: '#ffffff', fontSize: '0.6875rem' }}
              >
                WhatsApp
              </button>

              <button
                onClick={() => handleShareClick('facebook')}
                className="btn btn-secondary btn-sm"
                style={{ backgroundColor: '#1877f2', color: '#ffffff', fontSize: '0.6875rem' }}
              >
                Facebook
              </button>

              <button
                onClick={() => handleShareClick('twitter')}
                className="btn btn-secondary btn-sm"
                style={{ backgroundColor: '#000000', color: '#ffffff', fontSize: '0.6875rem' }}
              >
                Twitter / X
              </button>

              <button
                onClick={() => handleShareClick('telegram')}
                className="btn btn-secondary btn-sm"
                style={{ backgroundColor: '#229ed9', color: '#ffffff', fontSize: '0.6875rem' }}
              >
                Telegram
              </button>

              <button
                onClick={() => handleShareClick('copy')}
                className="btn btn-primary"
                style={{ gridColumn: 'span 2', fontSize: '0.6875rem' }}
              >
                {copiedLink ? 'Copied Link ✅' : 'Copy School Link'}
              </button>

            </div>
          </div>
        )}
      </div>
    </article>
  );
}
