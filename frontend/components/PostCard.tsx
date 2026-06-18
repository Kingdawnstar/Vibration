import React, { useState } from 'react';
import { Post } from '../types';
import { Share2, Heart, MessageSquare, ExternalLink, Calendar, BookOpen, Check, PlayCircle, FileText } from 'lucide-react';

interface PostCardProps {
  key?: string;
  post: Post;
  userLiked: boolean;
  onLikeToggle: (postId: string) => void;
  onSelect: (post: Post) => void;
}

export default function PostCard({ post, userLiked, onLikeToggle, onSelect }: PostCardProps) {
  const [showShareDrawer, setShowShareDrawer] = useState(false);
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

  return (
    <article 
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:shadow-black/20"
      id={`post_card_${post.postId}`}
    >
      {/* Category & Type Indicator Tags */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5 items-center">
        <span className="inline-flex items-center rounded-xl bg-orange-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-orange-500/20">
          {post.category}
        </span>
        <span className="inline-flex items-center rounded-xl bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-500 shadow-sm">
          {post.type === 'video' ? '🎥 Video' : post.type === 'blog' ? '✍️ Blog' : '📚 Lesson'}
        </span>
      </div>

      {/* Decorative Waveform Header matching post type */}
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800/40">
        <div className="absolute inset-0 bg-[radial-gradient(#ff5a1f_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
        
        {post.type === 'video' ? (
          <div className="text-center p-4 group-hover:scale-105 transition-transform duration-300">
            <PlayCircle className="mx-auto h-9 w-9 text-amber-500 animate-pulse" />
            <p className="mt-2 text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Video Masterclass</p>
          </div>
        ) : post.type === 'blog' ? (
          <div className="text-center p-4 group-hover:scale-105 transition-transform duration-300">
            <FileText className="mx-auto h-8 w-8 text-emerald-500 opacity-80" />
            <p className="mt-2 text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Editorial Blog</p>
          </div>
        ) : (
          <div className="text-center p-4 group-hover:scale-105 transition-transform duration-300">
            <BookOpen className="mx-auto h-8 w-8 text-orange-500 opacity-60" />
            <p className="mt-2 text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Interactive Lesson</p>
          </div>
        )}
      </div>

      {/* Card Content body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center space-x-2 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
          <Calendar className="h-3 w-3 text-zinc-300 dark:text-zinc-600" />
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>

        <h3 
          onClick={() => onSelect(post)}
          className="mt-3.5 cursor-pointer text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 line-clamp-2 transition-colors hover:text-orange-600 dark:hover:text-amber-500"
        >
          {post.title}
        </h3>

        <p className="mt-2.5 flex-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3">
          {post.content.replace(/[#`*_-]/g, '')}
        </p>

        {/* Attachment summary counter */}
        {post.media && post.media.length > 0 && (
          <div className="mt-3 flex items-center space-x-1.5 text-orange-700">
            <span className="text-[10px] bg-orange-50 px-2 py-0.5 rounded font-mono font-bold uppercase">
              📂 includes {post.media.length} files
            </span>
          </div>
        )}

        {/* Social interactions and actions footer */}
        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-4">
          <div className="flex items-center space-x-4">
            {/* Likes */}
            <button
              onClick={() => onLikeToggle(post.postId)}
              className={`flex items-center space-x-1.5 text-xs font-semibold focus:outline-none ${
                userLiked ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300'
              }`}
            >
              <Heart className={`h-4 w-4 ${userLiked ? 'fill-current' : ''}`} />
              <span className="font-mono">{post.likesCount}</span>
            </button>

            {/* Comments count */}
            <button 
              onClick={() => onSelect(post)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500 hover:text-orange-650 dark:hover:text-orange-400 animate-pulse"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="font-mono">{post.commentsCount}</span>
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowShareDrawer(!showShareDrawer)}
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-950 dark:hover:text-white focus:outline-none"
              title="Share Lesson"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => onSelect(post)}
              className="inline-flex items-center space-x-1 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-zinc-800"
            >
              <span>Learn</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Quick Share Overlay Drawer */}
        {showShareDrawer && (
          <div className="mt-4 border-t border-dashed border-zinc-100 pt-3.5 animate-fadeIn">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2.5">Broadcast / Share Course</p>
            <div className="grid grid-cols-4 gap-1.5">
              
              <button
                onClick={() => handleShareClick('whatsapp')}
                className="flex items-center justify-center rounded-xl bg-emerald-50 py-2.5 font-bold text-emerald-800 hover:bg-emerald-100 text-[9px] transition-colors cursor-pointer"
              >
                WhatsApp
              </button>

              <button
                onClick={() => handleShareClick('facebook')}
                className="flex items-center justify-center rounded-xl bg-blue-50 py-2.5 font-bold text-blue-800 hover:bg-blue-100 text-[9px] transition-colors cursor-pointer"
              >
                Facebook
              </button>

              <button
                onClick={() => handleShareClick('twitter')}
                className="flex items-center justify-center rounded-xl bg-zinc-900 py-2.5 font-bold text-zinc-100 hover:bg-zinc-800 text-[9px] transition-colors cursor-pointer"
              >
                Twitter / X
              </button>

              <button
                onClick={() => handleShareClick('telegram')}
                className="flex items-center justify-center rounded-xl bg-sky-50 py-2.5 font-bold text-sky-800 hover:bg-sky-100 text-[9px] transition-colors cursor-pointer"
              >
                Telegram
              </button>

              <button
                onClick={() => handleShareClick('linkedin')}
                className="flex items-center justify-center rounded-xl bg-indigo-50 py-2.5 font-bold text-indigo-800 hover:bg-indigo-100 text-[9px] transition-colors cursor-pointer"
              >
                LinkedIn
              </button>

              <button
                onClick={() => handleShareClick('email')}
                className="flex items-center justify-center rounded-xl bg-red-50 py-2.5 font-bold text-red-800 hover:bg-red-100 text-[9px] transition-colors cursor-pointer"
              >
                Email
              </button>

              <button
                onClick={() => handleShareClick('copy')}
                className="col-span-2 flex items-center justify-center rounded-xl bg-amber-500 py-2.5 font-bold text-black hover:bg-amber-400 text-[9px] transition-colors cursor-pointer"
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
