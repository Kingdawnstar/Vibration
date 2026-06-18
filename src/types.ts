export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface MediaAttachment {
  name: string;
  url: string;
  type: 'pdf' | 'image' | 'link';
}

export interface Post {
  postId: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  type?: 'lesson' | 'video' | 'blog';
  videoUrl?: string; // YouTube embed pattern supported
  media: MediaAttachment[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface Comment {
  commentId: string;
  postId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  text: string;
  createdAt: string;
}

export interface Like {
  likeId: string; // userId_postId
  postId: string;
  userId: string;
  createdAt: string;
}

export interface NotificationFeed {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  postId: string;
  read: boolean;
  createdAt: string;
}

export interface Review {
  reviewId: string;
  name: string;
  rating: number; // 1-5
  proficientLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  comment: string;
  createdAt: string;
}

export interface CurriculumItem {
  itemId: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  title: string;
  description: string;
  postId?: string; // Optional links to posts
  order: number;
  createdAt: string;
}

