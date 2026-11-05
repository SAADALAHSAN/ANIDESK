export interface AnimeCard {
  id: number;
  slug: string;
  title: string;
  title_jp?: string;
  title_romaji?: string;
  poster: string;
  type: string;
  sub: number;
  dub: number;
  eps?: number | null;
  rating?: string | null;
  duration?: string | null;
  status?: string | null;
  score?: number | null;
  episode_id?: number;
  episode_number?: number;
  banner?: string;
  synopsis?: string;
  mal_id?: number;
  anilist_id?: number;
}

export interface HomeData {
  spotlight: AnimeCard[];
  trending: AnimeCard[];
  latest: AnimeCard[];
  new_releases: AnimeCard[];
  top_airing: AnimeCard[];
  most_popular: AnimeCard[];
  completed: AnimeCard[];
  top_movies: AnimeCard[];
  top10: {
    today: AnimeCard[];
    week: AnimeCard[];
    month: AnimeCard[];
  };
}

export interface Genre {
  id: number;
  slug: string;
  name: string;
  image?: string;
}

export interface Character {
  id: number;
  name: string;
  role: string;
  image?: string;
  voice_actor?: {
    name: string;
    image?: string;
    language?: string;
  };
}

export interface AnimeDetail extends AnimeCard {
  genres: Genre[];
  studios?: Array<{ id: number; name: string }>;
  season?: string;
  aired?: string;
  mal_id?: number;
  anilist_id?: number;
  related?: AnimeCard[];
  seasons?: Array<{ id: number; title: string; season: string; is_current?: boolean }>;
  characters?: Character[];
  next_episode_at?: string;
  recommended?: AnimeCard[];
  comments_count?: number;
  trailer_youtube_id?: string;
}

export interface EpisodeItem {
  id: number;
  number: number;
  title: string;
  is_filler: boolean;
  has_sub: boolean;
  has_dub: boolean;
  has_hsub?: boolean;
  thumbnail?: string | null;
  aired_at?: string | null;
}

export interface EpisodesResponse {
  data: EpisodeItem[];
  ranges?: Array<{ start: number; end: number; label: string }>;
}

export interface SubtitleTrack {
  lang: string;
  label: string;
  url: string;
  default: boolean;
}

export interface QualityLevel {
  height: number;
  bandwidth: number;
}

export interface PlaySource {
  kind: 'hls' | 'iframe';
  server: string;
  server_id?: number;
  url: string;
  mirrors?: string[];
  media_headers?: Record<string, string>;
  qualities?: QualityLevel[];
  subtitles?: SubtitleTrack[];
  sprite_vtt?: string;
  thumb?: string;
  skip?: {
    intro?: [number, number] | null;
    outro?: [number, number] | null;
  };
  duration?: number;
  resolvable?: boolean;
  embed_url?: string;
}

export interface PlaybackData {
  episode_id: number;
  track: 'sub' | 'dub';
  tracks: string[];
  sources: PlaySource[];
  next_episode?: { id: number; number: number } | null;
  prev_episode?: { id: number; number: number } | null;
  resume_position?: number | null;
  entitlements?: any;
}

export interface ScheduleItem extends AnimeCard {
  time: string;
  airing_at: string;
}

export interface ScheduleDay {
  date: string;
  label: string;
}

export interface ScheduleData {
  date: string;
  days: ScheduleDay[];
  items: ScheduleItem[];
}

export interface CommentItem {
  id: number;
  user: {
    id: number;
    username: string;
    avatar?: string;
    badge?: string;
  };
  body: string;
  created_at: string;
  likes_count: number;
  replies_count: number;
  is_liked?: boolean;
}

export interface CommentsResponse {
  data: CommentItem[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

export interface W2gRoom {
  public_id: string;
  name?: string;
  title?: string;
  host: {
    id: number;
    name?: string;
    username: string;
    avatar?: string;
    rank?: string | null;
  };
  anime: AnimeCard;
  episode: {
    id: number;
    number: number;
    title?: string;
  };
  track?: string;
  is_private: boolean;
  visibility?: string;
  members?: number;
  members_count?: number;
  status: 'playing' | 'paused' | 'waiting' | 'live' | string;
  created_at?: string;
}

export interface CommunityPost {
  id: number;
  user: {
    id: number;
    name?: string;
    username: string;
    avatar?: string;
    rank?: string;
    badge?: string;
  };
  title: string;
  body: string;
  tag?: {
    key: string;
    name: string;
  };
  tags?: string[];
  votes?: number;
  votes_count?: number;
  likes?: number;
  comments_count: number;
  is_pinned?: boolean;
  is_locked?: boolean;
  created_at: string;
  path?: string;
  user_vote?: number;
}
