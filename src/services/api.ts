import {
  HomeData,
  AnimeDetail,
  EpisodesResponse,
  PlaybackData,
  PlaySource,
  Genre,
  ScheduleData,
  W2gRoom,
  AnimeCard,
} from '../types/api';
import { getEnmaServers } from './enmaApi';

// Mirror domains extracted from APK decompilation with auto-failover
const MIRROR_DOMAINS = [
  'https://anifam.buzz',
  'https://anifam.top',
  'https://anifam.cfd',
  'https://anifam.net',
];

let activeDomainIndex = 0;

export function getActiveDomain(): string {
  return MIRROR_DOMAINS[activeDomainIndex] || MIRROR_DOMAINS[0];
}

export function getImageUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const domain = getActiveDomain();
  return `${domain}${path.startsWith('/') ? '' : '/'}${path}`;
}

const defaultHeaders = {
  'User-Agent': 'AniFam/0.1.2 (Android; Mobile)',
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let lastError: any = null;

  // Try each mirror starting from the last known good domain
  for (let attempt = 0; attempt < MIRROR_DOMAINS.length; attempt++) {
    const domainIdx = (activeDomainIndex + attempt) % MIRROR_DOMAINS.length;
    const domain = MIRROR_DOMAINS[domainIdx];
    const url = `${domain}/api/v1/app${cleanEndpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s fast timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Fast fail for unresolvable server endpoints without mirror flooding
        if (response.status === 404 && cleanEndpoint.includes('/resolve')) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Server unresolvable');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      // Mark this domain as active for instant subsequent queries
      activeDomainIndex = domainIdx;
      return await response.json();
    } catch (err: any) {
      if (cleanEndpoint.includes('/resolve') && (err.message.includes('unresolvable') || err.message.includes('own player'))) {
        throw err;
      }
      console.warn(`[ANIDESK] Mirror ${domain} failed (${err.message}). Trying next...`);
      lastError = err;
    }
  }

  throw new Error(`All ANIDESK mirrors failed: ${lastError?.message || 'Network Timeout'}`);
}

export function reorderSources(rawSources: PlaySource[]): PlaySource[] {
  if (!rawSources || !Array.isArray(rawSources) || rawSources.length === 0) return [];

  const sources = [...rawSources];
  const directHlsSources: PlaySource[] = [];
  const hd1Sources: PlaySource[] = [];
  const hd2Sources: PlaySource[] = [];
  const vidstreamSources: PlaySource[] = [];
  const otherOriginalSources: PlaySource[] = [];
  const enmaSources: PlaySource[] = [];

  for (const src of sources) {
    const sName = (src.server || '').trim().toLowerCase();

    if (sName.includes('enma')) {
      enmaSources.push(src);
    } else if (sName.includes('hd-1') || sName.includes('hd 1')) {
      hd1Sources.push({
        ...src,
        server: 'HD-1 (Ultra HD • 5.5M)',
      });
    } else if (sName.includes('hd-2') || sName.includes('hd 2')) {
      hd2Sources.push({
        ...src,
        server: 'HD-2 (Ultra HD • 5.5M)',
      });
    } else if (src.kind === 'hls' || (src.url && src.url.includes('.m3u8'))) {
      directHlsSources.push({
        ...src,
        server: src.server?.includes('AniFam') ? 'AniFam (Direct 1080p)' : (src.server || 'Direct HLS'),
      });
    } else if (sName.includes('vidstream-1') || sName.includes('vidstream 1')) {
      vidstreamSources.push({
        ...src,
        server: 'Vidstream-1',
      });
    } else if (sName.includes('vidstream-2') || sName.includes('vidstream 2')) {
      vidstreamSources.push({
        ...src,
        server: 'Vidstream-2',
      });
    } else {
      otherOriginalSources.push(src);
    }
  }

  // Priority order (Highest Fidelity First):
  // 1. HD-1 (Ultra HD 5.5 Mbps - MovieBox/ByteDance CDN)
  // 2. Direct HLS streams (AniFam Direct 1080p)
  // 3. HD-2 (Ultra HD 5.5 Mbps Backup)
  // 4. Vidstream-1 & Vidstream-2 (AniFam Vidstream resolvers)
  // 5. Any other original mirrors
  // 6. Enma High-Speed HD Streaming Servers (Added Working Mirrors)
  return [
    ...hd1Sources,
    ...directHlsSources,
    ...hd2Sources,
    ...vidstreamSources,
    ...otherOriginalSources,
    ...enmaSources,
  ];
}

export const api = {
  // Active Mirror Info
  getActiveDomain,

  // Home & Discover
  getHome: (): Promise<HomeData> => request<HomeData>('/home'),

  // Anime & Episodes
  getAnimeDetail: (id: number): Promise<AnimeDetail> => request<AnimeDetail>(`/anime/${id}`),

  getEpisodes: (animeId: number): Promise<EpisodesResponse> =>
    request<EpisodesResponse>(`/anime/${animeId}/episodes`),

  // Playback & Resolvers
  playEpisode: async (
    episodeId: number,
    track: 'sub' | 'dub' = 'sub',
    anilistId?: number,
    episodeNum?: number
  ): Promise<PlaybackData> => {
    let data: PlaybackData | null = null;
    try {
      data = await request<PlaybackData>(`/episodes/${episodeId}/play`, {
        method: 'POST',
        body: JSON.stringify({ track }),
      });
    } catch (err) {
      console.warn('[ANIDESK] Primary AniFam play endpoint error:', err);
    }

    // Generate Enma high-definition backup streams
    let enmaServers: PlaySource[] = [];
    if (anilistId && episodeNum) {
      enmaServers = getEnmaServers(anilistId, episodeNum, track);
    }

    if (data) {
      const combined = [...(data.sources || []), ...enmaServers];
      data.sources = reorderSources(combined);
      return data;
    }

    // If primary server failed, rescue with Enma servers immediately
    if (enmaServers.length > 0) {
      return {
        episode_id: episodeId,
        track,
        tracks: ['sub', 'dub'],
        sources: enmaServers,
        next_episode: null,
        prev_episode: null,
        resume_position: null,
      };
    }

    throw new Error('All streaming servers are currently unreachable for this episode.');
  },

  resolveServer: (
    episodeId: number,
    serverId: number,
    track: 'sub' | 'dub' = 'sub'
  ): Promise<PlaySource> =>
    request<PlaySource>(`/episodes/${episodeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ server_id: serverId, track }),
    }),

  // Search & Suggestions
  search: (query: string, page = 1): Promise<{ data: AnimeCard[]; meta?: any }> =>
    request<{ data: AnimeCard[]; meta?: any }>(`/search?q=${encodeURIComponent(query)}&page=${page}`),

  searchSuggest: (query: string): Promise<AnimeCard[]> =>
    request<AnimeCard[]>(`/search/suggest?q=${encodeURIComponent(query)}`),

  // Genres & Browse
  getGenres: (): Promise<Genre[]> => request<Genre[]>('/genres'),

  browse: (params: {
    genre?: string;
    type?: string;
    status?: string;
    season?: string;
    year?: number;
    sort?: string;
    page?: number;
  }): Promise<{ data: AnimeCard[]; meta?: any }> => {
    const query = new URLSearchParams();
    if (params.genre) query.append('genre', params.genre);
    if (params.type) query.append('type', params.type);
    if (params.status) query.append('status', params.status);
    if (params.season) query.append('season', params.season);
    if (params.year) query.append('year', params.year.toString());
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page.toString());
    return request<{ data: AnimeCard[]; meta?: any }>(`/browse?${query.toString()}`);
  },

  // Release Schedule
  getSchedule: (date: string, tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone): Promise<ScheduleData> =>
    request<ScheduleData>(`/schedule?date=${date}&tz=${encodeURIComponent(tz)}`),

  // App Config & Meta
  getConfig: (): Promise<any> => request<any>('/config'),

  // Watch Together Rooms
  getW2gRooms: (page = 1, tab = 'public'): Promise<{ data: W2gRoom[]; meta?: any }> =>
    request<{ data: W2gRoom[]; meta?: any }>(`/w2g/rooms?page=${page}&tab=${tab}`),
};
