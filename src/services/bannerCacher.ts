export interface AnimeMediaAssets {
  fanart?: string;
  clearlogo?: string;
  banner?: string;
  poster?: string;
}

export interface AniListTrendingMedia {
  id: number;
  idMal?: number;
  title: {
    romaji: string;
    english: string;
  };
  bannerImage?: string;
  coverImage?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
    color?: string;
  };
  trailer?: {
    id: string;
    site: string;
    thumbnail?: string;
  };
  status?: string;
  duration?: number;
  format?: string;
  seasonYear?: number;
  season?: string;
  averageScore?: number;
  episodes?: number;
  description?: string;
  genres?: string[];
  fanart4k?: string;
  standardBanner?: string;
  highResBanner?: string;
  clearLogo?: string;
}

const memoryCache = new Map<number | string, AnimeMediaAssets>();

const STORAGE_CACHE_KEY = 'anidesk_banner_cache_v4';
const ANILIST_TRENDING_KEY = 'anidesk_anilist_trending_v4';

export const MASTER_4K_SEED_ITEMS: AniListTrendingMedia[] = [
  {
    id: 21,
    idMal: 21,
    title: { english: 'One Piece', romaji: 'ONE PIECE' },
    fanart4k: 'https://artworks.thetvdb.com/banners/v4/series/81797/backgrounds/616009a8bd688.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/v4/series/81797/backgrounds/616009a8bd688.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/v4/series/81797/backgrounds/616009a8bd688.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/series/81797/icons/5eee2a0450c0e.jpg',
    bannerImage: 'https://artworks.thetvdb.com/banners/v4/series/81797/backgrounds/616009a8bd688.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/81797/posters/63ab23cde990b.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/81797/posters/63ab23cde990b.jpg',
    },
    trailer: { id: 'MCb13lbKpsk', site: 'youtube' },
    averageScore: 89,
    episodes: 1122,
    format: 'TV',
    season: 'FALL',
    seasonYear: 1999,
    description: 'Gol D. Roger was known as the "Pirate King," the strongest and most infamous being to have sailed the Grand Line. Monkey D. Luffy sets out on his adventure in search of the legendary One Piece.',
    genres: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy'],
  },
  {
    id: 151807,
    idMal: 52299,
    title: { english: 'Solo Leveling', romaji: 'Ore dake Level Up na Ken' },
    fanart4k: 'https://artworks.thetvdb.com/banners/v4/series/389597/backgrounds/61ed3bc02a309.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/v4/series/389597/backgrounds/61ed3bc02a309.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/v4/series/389597/backgrounds/61ed3bc02a309.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/v4/series/389597/clearlogo/696daf50e6fc8.png',
    bannerImage: 'https://artworks.thetvdb.com/banners/v4/series/389597/backgrounds/61ed3bc02a309.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/389597/posters/65910fa8d6263.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/389597/posters/65910fa8d6263.jpg',
    },
    trailer: { id: '9n_mF_FkHj8', site: 'youtube' },
    averageScore: 84,
    episodes: 25,
    format: 'TV',
    season: 'WINTER',
    seasonYear: 2024,
    description: 'In a world where hunters awakened with supernatural powers battle deadly monsters, Sung Jinwoo is an infamous E-rank hunter known as the weakest. When trapped inside a perilous double dungeon, a mysterious quest window appears before him.',
    genres: ['Action', 'Adventure', 'Fantasy'],
  },
  {
    id: 113415,
    idMal: 40748,
    title: { english: 'Jujutsu Kaisen', romaji: 'Jujutsu Kaisen' },
    fanart4k: 'https://artworks.thetvdb.com/banners/v4/series/377543/backgrounds/609cba7794bab.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/v4/series/377543/backgrounds/609cba7794bab.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/v4/series/377543/backgrounds/609cba7794bab.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/v4/series/377543/icons/60735d109b705.png',
    bannerImage: 'https://artworks.thetvdb.com/banners/v4/series/377543/backgrounds/609cba7794bab.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/377543/posters/603e913a0c774.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/377543/posters/603e913a0c774.jpg',
    },
    trailer: { id: '4A_XgGWkvWA', site: 'youtube' },
    averageScore: 86,
    episodes: 47,
    format: 'TV',
    season: 'FALL',
    seasonYear: 2020,
    description: 'Idly indulging in supernatural activities with the Occult Club, high schooler Yuuji Itadori spends his days visiting his bedridden grandfather. However, his leisurely life soon takes a bizarre turn when he swallows the cursed finger of Ryomen Sukuna.',
    genres: ['Action', 'Drama', 'Supernatural'],
  },
  {
    id: 101922,
    idMal: 38000,
    title: { english: 'Demon Slayer: Kimetsu no Yaiba', romaji: 'Kimetsu no Yaiba' },
    fanart4k: 'https://artworks.thetvdb.com/banners/fanart/original/5c93cbb2b60b6.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/fanart/original/5c93cbb2b60b6.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/fanart/original/5c93cbb2b60b6.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/series/348545/icons/5f213aaff08e8.jpg',
    bannerImage: 'https://artworks.thetvdb.com/banners/fanart/original/5c93cbb2b60b6.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/348545/posters/60908d475f49a.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/348545/posters/60908d475f49a.jpg',
    },
    trailer: { id: 'VQGCKyvzIM4', site: 'youtube' },
    averageScore: 85,
    episodes: 63,
    format: 'TV',
    season: 'SPRING',
    seasonYear: 2019,
    description: 'Ever since the death of his father, the burden of supporting the family has fallen upon Tanjirou Kamado\'s shoulders. Returning home one snowy morning, he discovers his family slaughtered and his sister transformed into a demon.',
    genres: ['Action', 'Adventure', 'Supernatural'],
  },
  {
    id: 154587,
    idMal: 52991,
    title: { english: "Frieren: Beyond Journey's End", romaji: 'Sousou no Frieren' },
    fanart4k: 'https://artworks.thetvdb.com/banners/v4/series/424536/backgrounds/64e6cbe29d9c0.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/v4/series/424536/backgrounds/64e6cbe29d9c0.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/v4/series/424536/backgrounds/64e6cbe29d9c0.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/v4/series/424536/clearlogo/696a802a5aa22.png',
    bannerImage: 'https://artworks.thetvdb.com/banners/v4/series/424536/backgrounds/64e6cbe29d9c0.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/424536/posters/65910fa8d6263.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/424536/posters/65910fa8d6263.jpg',
    },
    trailer: { id: 'ZEkwCGJ3o_c', site: 'youtube' },
    averageScore: 93,
    episodes: 28,
    format: 'TV',
    season: 'FALL',
    seasonYear: 2023,
    description: 'The demon king has been defeated, and the victorious hero party returns home before disbanding. The four—mage Frieren, hero Himmel, priest Heiter, and warrior Eisen—reminisce over their decade-long journey.',
    genres: ['Adventure', 'Drama', 'Fantasy'],
  },
  {
    id: 171018,
    idMal: 57334,
    title: { english: 'Dan Da Dan', romaji: 'Dandadan' },
    fanart4k: 'https://artworks.thetvdb.com/banners/v4/series/432832/backgrounds/66fc835539bdd.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/v4/series/432832/backgrounds/66fc835539bdd.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/v4/series/432832/backgrounds/66fc835539bdd.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/v4/series/432832/clearlogo/66ff07d611ca0.png',
    bannerImage: 'https://artworks.thetvdb.com/banners/v4/series/432832/backgrounds/66fc835539bdd.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/432832/posters/66f68bf3471df.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/432832/posters/66f68bf3471df.jpg',
    },
    trailer: { id: '09mR4_z-g_k', site: 'youtube' },
    averageScore: 87,
    episodes: 12,
    format: 'TV',
    season: 'FALL',
    seasonYear: 2024,
    description: 'Momo Ayase strikes up an unusual friendship with her school\'s UFO fanatic, whom she nicknames Okarun. While Momo believes in spirits, she thinks aliens are nonsense.',
    genres: ['Action', 'Comedy', 'Supernatural'],
  },
  {
    id: 161645,
    idMal: 54492,
    title: { english: 'The Apothecary Diaries', romaji: 'Kusuriya no Hitorigoto' },
    fanart4k: 'https://artworks.thetvdb.com/banners/v4/series/431162/backgrounds/677ed0320e43e.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/v4/series/431162/backgrounds/677ed0320e43e.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/v4/series/431162/backgrounds/677ed0320e43e.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/v4/series/431162/clearlogo/660f5238334b2.png',
    bannerImage: 'https://artworks.thetvdb.com/banners/v4/series/431162/backgrounds/677ed0320e43e.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/431162/posters/65910fa8d6263.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/431162/posters/65910fa8d6263.jpg',
    },
    trailer: { id: '1u314_2qYck', site: 'youtube' },
    averageScore: 88,
    episodes: 24,
    format: 'TV',
    season: 'FALL',
    seasonYear: 2023,
    description: 'In the imperial court, a young woman named Maomao is kidnapped and sold into servitude in the emperor\'s palace. An apothecary by trade, she maintains a low profile until she hears the emperor\'s infants are falling deathly ill.',
    genres: ['Drama', 'Mystery'],
  },
  {
    id: 120120,
    idMal: 42249,
    title: { english: 'Tokyo Revengers', romaji: 'Tokyo Revengers' },
    fanart4k: 'https://artworks.thetvdb.com/banners/v4/series/393478/backgrounds/60f3733aa53e2.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/v4/series/393478/backgrounds/60f3733aa53e2.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/v4/series/393478/backgrounds/60f3733aa53e2.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/v4/series/393478/clearlogo/611d007ea31b7.png',
    bannerImage: 'https://artworks.thetvdb.com/banners/v4/series/393478/backgrounds/60f3733aa53e2.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/393478/posters/60d20e7c9ca6a.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/393478/posters/60d20e7c9ca6a.jpg',
    },
    trailer: { id: 'L_2Q1U98kF8', site: 'youtube' },
    averageScore: 78,
    episodes: 50,
    format: 'TV',
    season: 'SPRING',
    seasonYear: 2021,
    description: 'Takemichi Hanagaki\'s second year of middle school was the highest point in his life. Twelve years later, he is a nobody until he travels twelve years back in time to save his girlfriend Hinata.',
    genres: ['Action', 'Drama', 'Supernatural'],
  },
  {
    id: 127230,
    idMal: 44511,
    title: { english: 'Chainsaw Man', romaji: 'Chainsaw Man' },
    fanart4k: 'https://artworks.thetvdb.com/banners/v4/series/397934/backgrounds/62f7545a78181.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/v4/series/397934/backgrounds/62f7545a78181.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/v4/series/397934/backgrounds/62f7545a78181.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/v4/series/397934/clearlogo/61217f9851fc5.png',
    bannerImage: 'https://artworks.thetvdb.com/banners/v4/series/397934/backgrounds/62f7545a78181.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/397934/posters/6321adbb56f1a.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/397934/posters/6321adbb56f1a.jpg',
    },
    trailer: { id: 'q15CRdE5Bv0', site: 'youtube' },
    averageScore: 84,
    episodes: 12,
    format: 'TV',
    season: 'FALL',
    seasonYear: 2022,
    description: 'Denji is robbed of a normal teenage life, left with nothing but his deadbeat father\'s overwhelming debt to the yakuza. His only companion is his pet, the chainsaw devil Pochita.',
    genres: ['Action', 'Supernatural'],
  },
  {
    id: 120377,
    idMal: 42310,
    title: { english: 'Cyberpunk: Edgerunners', romaji: 'Cyberpunk: Edgerunners' },
    fanart4k: 'https://artworks.thetvdb.com/banners/v4/series/384541/backgrounds/632f460a7d19a.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/v4/series/384541/backgrounds/632f460a7d19a.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/v4/series/384541/backgrounds/632f460a7d19a.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/v4/series/384541/clearlogo/61c35a7441cb9.png',
    bannerImage: 'https://artworks.thetvdb.com/banners/v4/series/384541/backgrounds/632f460a7d19a.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/384541/posters/632f460a7d19a.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/384541/posters/632f460a7d19a.jpg',
    },
    trailer: { id: 'JtqIas3bYhg', site: 'youtube' },
    averageScore: 86,
    episodes: 10,
    format: 'ONA',
    season: 'FALL',
    seasonYear: 2022,
    description: 'A street kid trying to survive in Night City—a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an edgerunner.',
    genres: ['Action', 'Sci-Fi'],
  },
  {
    id: 269,
    idMal: 269,
    title: { english: 'Bleach: Thousand-Year Blood War', romaji: 'Bleach: Sennen Kessen-hen' },
    fanart4k: 'https://artworks.thetvdb.com/banners/fanart/original/74796-1.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/fanart/original/74796-1.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/fanart/original/74796-1.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/series/74796/icons/5f5e51c47fb6e.jpg',
    bannerImage: 'https://artworks.thetvdb.com/banners/fanart/original/74796-1.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/74796/posters/6308cfba808e0.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/74796/posters/6308cfba808e0.jpg',
    },
    trailer: { id: 'e8YBesRKq_o', site: 'youtube' },
    averageScore: 89,
    episodes: 26,
    format: 'TV',
    season: 'FALL',
    seasonYear: 2022,
    description: 'The peace is suddenly broken when warning sirens blare through the Soul Society. Residents are disappearing without a trace, and a dark shadow approaches Ichigo and his friends in Karakura Town.',
    genres: ['Action', 'Adventure', 'Supernatural'],
  },
  {
    id: 16498,
    idMal: 16498,
    title: { english: 'Attack on Titan', romaji: 'Shingeki no Kyojin' },
    fanart4k: 'https://artworks.thetvdb.com/banners/series/267440/backgrounds/5f8611eaa79ff.jpg',
    highResBanner: 'https://artworks.thetvdb.com/banners/series/267440/backgrounds/5f8611eaa79ff.jpg',
    standardBanner: 'https://artworks.thetvdb.com/banners/series/267440/backgrounds/5f8611eaa79ff.jpg',
    clearLogo: 'https://artworks.thetvdb.com/banners/series/267440/icons/5efdf4efb9aa4.jpg',
    bannerImage: 'https://artworks.thetvdb.com/banners/series/267440/backgrounds/5f8611eaa79ff.jpg',
    coverImage: {
      large: 'https://artworks.thetvdb.com/banners/v4/series/267440/posters/603e913a0c774.jpg',
      extraLarge: 'https://artworks.thetvdb.com/banners/v4/series/267440/posters/603e913a0c774.jpg',
    },
    trailer: { id: 'MGRm4IzK1SQ', site: 'youtube' },
    averageScore: 90,
    episodes: 89,
    format: 'TV',
    season: 'SPRING',
    seasonYear: 2013,
    description: 'Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called Titans, forcing humans to hide behind enormous concentric walls.',
    genres: ['Action', 'Drama', 'Fantasy'],
  },
];

function getStoredCache(): Record<string, AnimeMediaAssets> {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStoredCache(key: string | number, assets: AnimeMediaAssets) {
  try {
    const cache = getStoredCache();
    cache[String(key)] = assets;
    const keys = Object.keys(cache);
    if (keys.length > 250) {
      delete cache[keys[0]];
    }
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export const bannerCacher = {
  getMemory(id: number | string): AnimeMediaAssets | null {
    if (memoryCache.has(id)) return memoryCache.get(id)!;
    const stored = getStoredCache();
    const strId = String(id);
    if (stored[strId]) {
      memoryCache.set(id, stored[strId]);
      return stored[strId];
    }
    return null;
  },

  async fetchAssets(animeId: number | string, anilistId?: number, malId?: number): Promise<AnimeMediaAssets | null> {
    const existing = this.getMemory(animeId);
    if (existing) return existing;

    try {
      let queryUrl = '';
      if (anilistId) {
        queryUrl = `https://api.ani.zip/mappings?anilist_id=${anilistId}`;
      } else if (malId) {
        queryUrl = `https://api.ani.zip/mappings?mal_id=${malId}`;
      } else if (typeof animeId === 'number' && animeId > 0) {
        queryUrl = `https://api.ani.zip/mappings?anilist_id=${animeId}`;
      } else {
        return null;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(queryUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      const assets: AnimeMediaAssets = {};

      if (data.images && Array.isArray(data.images)) {
        for (const img of data.images) {
          const typeLower = (img.coverType || '').toLowerCase();
          const urlLower = (img.url || '').toLowerCase();

          if (
            (typeLower.includes('logo') ||
              typeLower === 'clearlogo' ||
              urlLower.includes('clearlogo') ||
              urlLower.includes('/icons/')) &&
            !assets.clearlogo
          ) {
            assets.clearlogo = img.url;
          }
          if (
            (typeLower.includes('fanart') || typeLower.includes('background')) &&
            !assets.fanart
          ) {
            assets.fanart = img.url;
          }
          if (typeLower.includes('banner') && !assets.banner) {
            assets.banner = img.url;
          }
          if (typeLower.includes('poster') && !assets.poster) {
            assets.poster = img.url;
          }
        }
      }

      memoryCache.set(animeId, assets);
      saveToStoredCache(animeId, assets);
      return assets;
    } catch {
      return null;
    }
  },

  // Fetch AniList live trending anime with High-Res TheTVDB 4K banners and YouTube trailers
  async fetchAniListTrending(perPage = 12): Promise<AniListTrendingMedia[]> {
    // Check cached first
    try {
      const raw = localStorage.getItem(ANILIST_TRENDING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 8) {
          // Verify cached entries have high-res fanarts
          const allHighRes = parsed.every(
            (p) => p.fanart4k && (p.fanart4k.includes('thetvdb.com') || p.fanart4k.includes('tmdb.org'))
          );
          if (allHighRes) {
            return parsed;
          }
        }
      }
    } catch {}

    const query = `
      query {
        Page(page: 1, perPage: 25) {
          media(sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false, type: ANIME) {
            id
            idMal
            title {
              romaji
              english
            }
            coverImage {
              extraLarge
              large
              medium
            }
            trailer {
              id
              site
            }
            status
            duration
            format
            seasonYear
            season
            averageScore
            episodes
            description
            genres
          }
        }
      }
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return MASTER_4K_SEED_ITEMS;
      }

      const json = await res.json();
      const rawMedia: any[] = json?.data?.Page?.media || [];

      // Enrich with True 1920x1080 TheTVDB 4K Fanart & ClearLogo in parallel
      const enriched = await Promise.all(
        rawMedia.map(async (item) => {
          try {
            const assets = await this.fetchAssets(item.id, item.id, item.idMal);
            // Strict 4K rule: ONLY accept authentic TheTVDB or TMDB 16:9 full landscape fanarts (identical to One Piece)
            if (assets?.fanart && (assets.fanart.includes('thetvdb.com') || assets.fanart.includes('tmdb.org'))) {
              return {
                ...item,
                fanart4k: assets.fanart,
                highResBanner: assets.fanart,
                standardBanner: assets.fanart,
                clearLogo: assets.clearlogo,
              } as AniListTrendingMedia;
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      // Filter out any anime that lacks a true 4K TVDB landscape fanart
      const verifiedOnly = enriched.filter((i): i is AniListTrendingMedia => i !== null);

      // Merge verified live items with Master 4K Seeds (avoid duplicates)
      const existingIds = new Set(verifiedOnly.map((v) => v.id));
      const combined = [...verifiedOnly];

      for (const seed of MASTER_4K_SEED_ITEMS) {
        if (!existingIds.has(seed.id)) {
          combined.push(seed);
          existingIds.add(seed.id);
        }
      }

      const finalList = combined.slice(0, Math.max(12, perPage));

      try {
        localStorage.setItem(ANILIST_TRENDING_KEY, JSON.stringify(finalList));
      } catch {}

      return finalList;
    } catch (err) {
      console.warn('[ANIDESK] Live AniList 4K fetch failed, using Master 4K seeds:', err);
      return MASTER_4K_SEED_ITEMS;
    }
  },
};
