import { SPORTS } from '../../constants';
import type { AIRecommendation, SportEvent, User } from '../../utils/types';
import type {
  BehaviorSignal,
  EventRecommendation,
  PersonalizedHomeFeed,
  TeammateRecommendation,
} from './aiTypes';
import { compatibilityService } from './compatibilityService';
import { eventSuggestionService } from './eventSuggestionService';
import { recommendationService } from './recommendationService';
import { userBehaviorService } from './userBehaviorService';
import { promptService } from './promptService';
import { chatService } from './chatService';
import { aiClient } from './aiClient';
import { mergeBehaviorWithUserSports, unique } from './aiHelpers';
import { locationService, Coordinates } from '../locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = '@sportsbuddy_venue_images_';
const VENUE_IMAGE_CACHE = new Map<string, string[]>();

const cleanImageUrl = (url: string): string => {
  if (!url) return '';
  let cleaned = url.trim();
  if (cleaned.startsWith('//')) {
    cleaned = 'https:' + cleaned;
  }
  return cleaned;
};

function hashDistance(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const km = (Math.abs(hash) % 7) + 1.2;
  return `${km.toFixed(1)} km away`;
}

function isSpecificVenueImage(venueName: string, imageTitle: string): boolean {
  const genericWords = new Set([
    'the', 'a', 'an', 'in', 'at', 'on', 'for', 'with', 'and', 'of', 'near',
    'public', 'private', 'ground', 'grounds', 'court', 'courts', 'turf', 'turfs',
    'stadium', 'stadiums', 'park', 'parks', 'field', 'fields', 'sports', 'sport',
    'club', 'clubs', 'arena', 'arenas', 'play', 'playing', 'center', 'centre',
    'complex', 'facility', 'facilities', 'file', 'png', 'jpg', 'jpeg', 'webp',
    'svg', 'gif', 'commons', 'wiki', 'wikimedia', 'image', 'photo', 'picture',
  ]);
  const cleanName = venueName.toLowerCase();
  const cleanTitle = imageTitle.toLowerCase().replace(/_/g, ' ');
  const venueWords = cleanName
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !genericWords.has(w));
  if (venueWords.length === 0) return false;
  return venueWords.some((word) => cleanTitle.includes(word));
}

export const aiService = {
  async getTeammateRecommendations(
    user: Partial<User>,
    availablePlayers?: Partial<User>[]
  ): Promise<TeammateRecommendation[]> {
    return recommendationService.getTeammateRecommendations(user, availablePlayers);
  },

  async getEventSuggestion(user: Partial<User>, nearbyEvents?: Partial<SportEvent>[]) {
    return eventSuggestionService.getEventSuggestion(user, nearbyEvents);
  },

  async getRecommendedEvents(
    user: Partial<User>,
    nearbyEvents?: Partial<SportEvent>[]
  ): Promise<EventRecommendation[]> {
    return eventSuggestionService.getRecommendedEvents(user, nearbyEvents);
  },

  async getSportRecommendations(user: Partial<User>): Promise<string[]> {
    const behavior = user.uid
      ? await userBehaviorService.getUserBehaviorProfile(user.uid)
      : null;
    const profileSports = mergeBehaviorWithUserSports(user, behavior);
    const fallbackSports = SPORTS.map((sport) => sport.name);
    const suggestions = unique([...profileSports, ...fallbackSports]).slice(0, 5);
    if (!suggestions.length) return ['Basketball', 'Tennis', 'Soccer'];
    const prompt = promptService.buildSportsSuggestionPrompt(user, behavior);
    const aiText = await promptService.generateShortExplanation(prompt, suggestions.join(', '));
    return aiText
      .split(',')
      .map((sport) => sport.trim())
      .filter(Boolean)
      .slice(0, 5);
  },

  async getLocationSuggestions(
    city: string,
    sport: string,
    userCoords?: Coordinates | null
  ): Promise<{ name: string; distance?: string; distanceMeters?: number; images?: string[]; type?: 'public' | 'private' }[]> {
    console.log(`[AIService Logger] getLocationSuggestions called. City: "${city}", Sport: "${sport}", userCoords:`, userCoords);
    if (!city || !sport) {
      console.log(`[AIService Logger] Missing city ("${city}") or sport ("${sport}"). Returning empty array.`);
      return [];
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    const getSportQuerySuffix = (s: string): string => {
      const lower = s.toLowerCase().trim();
      if (['basketball', 'tennis', 'badminton', 'volleyball'].includes(lower)) return 'court';
      if (lower === 'swimming') return 'swimming pool';
      if (lower === 'golf') return 'golf course';
      if (['running', 'cycling'].includes(lower)) return 'track';
      return 'ground';
    };

    const isVenueRelevantToSport = (name: string, categories: string[], sportName: string): boolean => {
      const n = name.toLowerCase();
      const cats = (categories || []).map(c => c.toLowerCase());
      const s = sportName.toLowerCase().trim();

      let sportKeywords = [s];
      if (s === 'soccer') sportKeywords = ['soccer', 'football', 'turf', 'futsal'];
      else if (s === 'badminton') sportKeywords = ['badminton', 'shuttle'];
      else if (s === 'swimming') sportKeywords = ['swimming', 'pool'];
      else if (s === 'running') sportKeywords = ['running', 'track', 'athletics', 'jogging'];
      else if (s === 'cycling') sportKeywords = ['cycling', 'cycle', 'velodrome'];

      const matchesSelectedSport = sportKeywords.some(kw => n.includes(kw) || cats.some(c => c.includes(kw)));

      const allSportKeywordsMap: Record<string, string[]> = {
        basketball: ['basketball'], soccer: ['soccer', 'football', 'turf', 'futsal'],
        tennis: ['tennis'], volleyball: ['volleyball'],
        running: ['running', 'track', 'athletics', 'jogging'], swimming: ['swimming', 'pool'],
        golf: ['golf'], baseball: ['baseball', 'softball'],
        cycling: ['cycling', 'cycle', 'velodrome'], badminton: ['badminton', 'shuttle'],
        cricket: ['cricket'],
      };

      const otherKeywords: string[] = [];
      Object.keys(allSportKeywordsMap).forEach(key => {
        if (key !== s) otherKeywords.push(...allSportKeywordsMap[key]);
      });

      const matchesOtherSport = otherKeywords.some(kw => n.includes(kw) || cats.some(c => c.includes(kw)));
      if (matchesOtherSport && !matchesSelectedSport) return false;
      if (matchesSelectedSport) return true;

      const generalKeywords = [
        'sports club', 'sports complex', 'sports center', 'sports centre',
        'stadium', 'gymnasium', 'recreation', 'playground', 'park', 'arena', 'club', 'academy',
      ];
      return generalKeywords.some(kw => n.includes(kw) || cats.some(c => c.includes(kw)));
    };

    // ── Botasaurus scraper ─────────────────────────────────────────────────
    const scrapeGoogleMapsPlaces = async (
      sportName: string,
      cityName: string,
      coords?: Coordinates | null
    ): Promise<{ name: string; lat?: number; lon?: number; type: 'public' | 'private'; address?: string; fid?: string; featuredImage?: string; _photos?: string[] }[]> => {
      const baseUrl = (process.env.EXPO_PUBLIC_BOTASAURUS_URL || 'http://localhost:8000').replace(/\/$/, '');
      const suffix = getSportQuerySuffix(sportName);

      let searchLink: string;
      if (coords) {
        searchLink = `https://www.google.com/maps/search/${encodeURIComponent(sportName + ' ' + suffix)}/@${coords.latitude},${coords.longitude},13z`;
      } else {
        searchLink = `https://www.google.com/maps/search/${encodeURIComponent(sportName + ' ' + suffix + ' in ' + cityName)}`;
      }

      const payload = {
        search_method: 'links',
        search_links: [searchLink],
        extraction_method: 'fast',
        enable_photos_extraction: true,
        max_photos: 5,
        max_results: 20,
        enrichment_filters: ['not_permanently_closed'],
        lang: 'en',
        enable_website_contacts: false,
        enable_emails_social: false,
        enable_sales_summary: false,
        enable_phone_info: false,
        enable_leads: false,
        enable_reviews_extraction: false,
      };

      const parsePlaces = (raw: any): any[] => {
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        if (Array.isArray(raw?.results)) return raw.results;
        return [];
      };

      const mapPlaces = (places: any[]) =>
        places
          .filter((item: any) => {
            const name = item.name || item.Name || '';
            const cats = item.categories || item.Categories || [];
            return name && isVenueRelevantToSport(name, cats, sportName);
          })
          .map((item: any) => {
            const name = item.name || item.Name || '';
            const cats: string[] = item.categories || item.Categories || [];
            const isPrivate = cats.some((cat: string) =>
              ['club', 'academy', 'complex', 'arena', 'stadium', 'indoor', 'private'].some(w => cat.toLowerCase().includes(w))
            ) || (item.description || '').toLowerCase().includes('booking')
              || (item.description || '').toLowerCase().includes('paid');

            const photos: string[] = (item.photos || [])
              .map((p: any) => (typeof p === 'string' ? p : p?.link || p?.url || p?.photoUrl || ''))
              .filter(Boolean)
              .slice(0, 5);

            return {
              name,
              lat: item.latitude != null ? parseFloat(String(item.latitude)) : undefined,
              lon: item.longitude != null ? parseFloat(String(item.longitude)) : undefined,
              type: (isPrivate ? 'private' : 'public') as 'public' | 'private',
              address: item.full_address || item.address || item.Fulladdress,
              fid: item.place_id || item.fid || item.Fid,
              featuredImage: photos[0] || item.main_image || item.featured_image || item['Featured Image'],
              _photos: photos,
            };
          });

      try {
        const headers = {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'any',
        };

        // ── Strategy 1: Sync task — POST /tasks/create-task-sync ──
        // Mirrors api.createSyncTask() from botasaurus-desktop-api npm package.
        // The server blocks until scraping is done and returns the task object(s).
        console.log('[AIService Logger] Calling POST /tasks/create-task-sync...');
        const syncRes = await fetch(`${baseUrl}/tasks/create-task-sync`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ scraper_name: 'google_maps_scraper', data: payload }),
        });

        if (syncRes.ok) {
          const rawResponse = await syncRes.json();
          const tasks = Array.isArray(rawResponse) ? rawResponse : [rawResponse];
          console.log(`[AIService Logger] Sync tasks received count: ${tasks.length}`);

          let allScrapedPlaces: any[] = [];

          // Try to get embedded results directly from all returned tasks
          for (const task of tasks) {
            const embedded: any[] =
              (Array.isArray(task?.result) && task.result.length > 0 ? task.result : null) ??
              (Array.isArray(task?.results) && task.results.length > 0 ? task.results : null) ??
              (Array.isArray(task?.data) && task.data.length > 0 ? task.data : null) ??
              [];
            if (embedded.length > 0) {
              allScrapedPlaces.push(...embedded);
            }
          }

          if (allScrapedPlaces.length > 0) {
            console.log(`[AIService Logger] Sync task embedded ${allScrapedPlaces.length} places directly.`);
            return mapPlaces(allScrapedPlaces);
          }

          // No embedded results — fetch via separate results endpoint for each task
          for (const task of tasks) {
            const taskId = task?.id ?? task?.task_id;
            if (taskId) {
              console.log(`[AIService Logger] Fetching results via POST /tasks/${taskId}/results...`);
              const rRes = await fetch(`${baseUrl}/tasks/${taskId}/results`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ page: 1 }),
              }).catch(() => null);
              if (rRes?.ok) {
                const raw = await rRes.json();
                const places = parsePlaces(raw);
                if (places.length > 0) {
                  allScrapedPlaces.push(...places);
                }
              } else {
                console.warn(`[AIService Logger] Results endpoint failed for task ${taskId}:`, rRes?.status);
              }
            }
          }

          if (allScrapedPlaces.length > 0) {
            console.log(`[AIService Logger] Sync task fetched results returned ${allScrapedPlaces.length} places.`);
            return mapPlaces(allScrapedPlaces);
          }
          console.warn('[AIService Logger] Sync task had no usable results. Trying async task...');
        } else {
          const errText = await syncRes.text().catch(() => '');
          console.warn(`[AIService Logger] Sync task failed (${syncRes.status}): ${errText}. Trying async task...`);
        }

        // ── Strategy 2: Async task — create, poll, fetch results ──
        // Mirrors api.createAsyncTask + api.getTask + api.getTaskResults.
        console.log('[AIService Logger] Calling POST /tasks/create-task-async...');
        const asyncRes = await fetch(`${baseUrl}/tasks/create-task-async`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ scraper_name: 'google_maps_scraper', data: payload }),
        });

        if (!asyncRes.ok) {
          console.warn('[AIService Logger] Async task failed:', asyncRes.status, '— returning empty.');
          return [];
        }

        const rawAsyncResponse = await asyncRes.json();
        const asyncTasks = Array.isArray(rawAsyncResponse) ? rawAsyncResponse : [rawAsyncResponse];
        
        // Find parent task (usually index 0 or is_all_task = true)
        const parentTask = asyncTasks.find(t => t?.is_all_task) || asyncTasks[0];
        const asyncTaskId = parentTask?.id ?? parentTask?.task_id;
        console.log('[AIService Logger] Async task id to poll:', asyncTaskId);
        if (!asyncTaskId) return [];

        // Poll GET /tasks/{id} every 4 s, max 90 s total
        for (let attempt = 0; attempt < 23; attempt++) {
          await new Promise(r => setTimeout(r, 4000));
          const sRes = await fetch(`${baseUrl}/tasks/${asyncTaskId}`, {
            headers: { 'ngrok-skip-browser-warning': 'any' }
          }).catch(() => null);
          if (!sRes?.ok) continue;
          const sData = await sRes.json();
          const status = (sData?.status || '').toLowerCase();
          console.log(`[AIService Logger] Async task ${asyncTaskId}: ${status} (attempt ${attempt + 1})`);
          if (['completed', 'finished', 'done'].includes(status)) {
            let allScrapedPlaces: any[] = [];
            for (const task of asyncTasks) {
              const tid = task?.id ?? task?.task_id;
              if (tid) {
                const rRes = await fetch(`${baseUrl}/tasks/${tid}/results`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ page: 1 }),
                }).catch(() => null);
                if (rRes?.ok) {
                  const raw = await rRes.json();
                  allScrapedPlaces.push(...parsePlaces(raw));
                }
              }
            }
            return mapPlaces(allScrapedPlaces);
          }
          if (['failed', 'error', 'aborted'].includes(status)) {
            console.warn('[AIService Logger] Async task failed:', status);
            return [];
          }
        }
        console.warn('[AIService Logger] Async task timed out after 90 s.');
        return [];
      } catch (err) {
        console.error('[AIService Logger] Error calling Botasaurus:', err);
        return [];
      }
    };

    const fetchPlacePhotos = async (_fid: string, preloaded?: string[]): Promise<string[]> => {
      // Photos fetched inline by Botasaurus (enable_photos_extraction: true)
      return preloaded && preloaded.length > 0 ? preloaded : [];
    };

    // ── 1. Scraper ─────────────────────────────────────────────────────────
    console.log('[AIService Logger] Scraping Google Maps places...');
    const scraped = await scrapeGoogleMapsPlaces(sport, city, userCoords);
    console.log(`[AIService Logger] Scraper returned ${scraped.length} places.`);

    // ── 2. AI suggestions ──────────────────────────────────────────────────
    let parsedVenues: { name: string; lat: number | undefined; lon: number | undefined; type: 'public' | 'private' }[] = [];
    const prompt = promptService.buildLocationSuggestionPrompt(city, sport);
    console.log(`[AIService Logger] AI Prompt built: "${prompt}"`);

    try {
      console.log('[AIService Logger] Querying AI client...');
      const response = await aiClient.generateAssistantResponse({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: 'You are a local sports scout assistant. Suggest real-world sports venues, public parks, municipal grounds, private sports turfs, and clubs for playing the specified sport in the specified city. Rely on your knowledge of local community discussions, Reddit threads, Facebook posts, and forums to recommend active places. For each venue, provide its approximate latitude and longitude coordinates and classify it as "public" (free, municipal, park) or "private" (commercial turf, indoor arena, club, paid booking). Format the output strictly as: Venue Name | Latitude | Longitude | Type, with one venue per line. Do not include bullet points, numbering, or introductory text. Example:\nIndira Gandhi Municipal Stadium | 16.5085 | 80.6472 | public\nVijetha Sports Academy | 16.5201 | 80.6212 | private',
        maxTokens: 350,
        temperature: 0.3,
      });

      console.log(`[AIService Logger] AI response content: "${response.content}"`);
      const lines = response.content.split('\n').map(line => line.trim()).filter(Boolean);

      parsedVenues = lines.map((line): { name: string; lat: number | undefined; lon: number | undefined; type: 'public' | 'private' } | null => {
        const parts = line.split('|');
        if (parts.length >= 4) {
          const name = parts[0].replace(/^-\s*/, '').trim();
          const lat = parseFloat(parts[1].trim());
          const lon = parseFloat(parts[2].trim());
          const type = parts[3].trim().toLowerCase();
          if (!isNaN(lat) && !isNaN(lon)) {
            return { name, lat, lon, type: (type === 'private' ? 'private' : 'public') as 'public' | 'private' };
          }
        } else if (parts.length >= 3) {
          const name = parts[0].replace(/^-\s*/, '').trim();
          const lat = parseFloat(parts[1].trim());
          const lon = parseFloat(parts[2].trim());
          if (!isNaN(lat) && !isNaN(lon)) {
            return { name, lat, lon, type: 'public' as const };
          }
        }
        const cleanName = line.replace(/^-\s*/, '').trim();
        if (cleanName && !cleanName.includes('|')) {
          return { name: cleanName, lat: undefined, lon: undefined, type: 'public' as const };
        }
        return null;
      }).filter((v): v is { name: string; lat: number | undefined; lon: number | undefined; type: 'public' | 'private' } => v !== null);
    } catch (error: any) {
      console.error('[AIService Logger] [Error] Failed to fetch AI location suggestions:', error);
    }

    // ── 3. Merge ───────────────────────────────────────────────────────────
    const combinedList: {
      name: string; lat?: number; lon?: number; type: 'public' | 'private';
      address?: string; fid?: string; featuredImage?: string; _photos?: string[];
      source: 'scraper' | 'ai';
    }[] = [];

    scraped.forEach(item => combinedList.push({ ...item, source: 'scraper' }));

    parsedVenues.forEach(aiItem => {
      const isDuplicate = combinedList.some(item =>
        item.name.toLowerCase().includes(aiItem.name.toLowerCase()) ||
        aiItem.name.toLowerCase().includes(item.name.toLowerCase())
      );
      if (!isDuplicate) {
        combinedList.push({ name: aiItem.name, lat: aiItem.lat, lon: aiItem.lon, type: aiItem.type, source: 'ai' });
      }
    });

    console.log(`[AIService Logger] Merged list contains ${combinedList.length} total venues.`);

    // ── 4. Enrich (geocoding, distance, images) ────────────────────────────
    const processPromises = combinedList.map(async (item, _index) => {
      const name = item.name;
      let lat = item.lat;
      let lon = item.lon;
      const type = item.type;
      let distanceText: string | undefined;
      let distanceMeters: number | undefined;
      let venueImages: string[] = [];

      // Geocode if lat/lon missing
      if (userCoords && (lat === undefined || lon === undefined)) {
        try {
          const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ', ' + city)}&format=json&limit=1`;
          const geoRes = await fetch(searchUrl, { headers: { 'User-Agent': 'SportsBuddy/1.0' } });
          const geoData = await geoRes.json();
          if (geoData?.[0]) {
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
          }
        } catch (err) {
          console.error(`[AIService Logger] Geocoding failed for "${name}":`, err);
        }
      }

      // Distance
      if (userCoords && lat !== undefined && lon !== undefined) {
        const dist = locationService.calculateDistance(userCoords, { latitude: lat, longitude: lon });
        distanceText = dist.readable;
        distanceMeters = dist.meters;
      }

      // Images (cache-first)
      const cacheKey = name.toLowerCase().trim();
      const cachedImages = VENUE_IMAGE_CACHE.get(cacheKey);
      if (cachedImages) {
        venueImages = cachedImages;
      } else {
        try {
          const persisted = await AsyncStorage.getItem(CACHE_KEY_PREFIX + cacheKey);
          if (persisted) {
            const parsed = JSON.parse(persisted);
            if (Array.isArray(parsed)) { venueImages = parsed; VENUE_IMAGE_CACHE.set(cacheKey, venueImages); }
          }
        } catch { /* ignore */ }

        if (venueImages.length === 0) {
          // A. Botasaurus inline photos
          if (item.source === 'scraper') {
            const scraperPhotos = await fetchPlacePhotos(item.fid || '', item._photos);
            if (scraperPhotos.length > 0) venueImages = scraperPhotos;
          }
          // B. Featured image
          if (venueImages.length === 0 && item.featuredImage) venueImages = [item.featuredImage];

          // C. Wikipedia pageimage
          if (venueImages.length === 0) {
            try {
              const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json&origin=*`;
              const wikiRes = await fetch(wikiUrl, { headers: { 'User-Agent': 'SportsBuddy/1.0' } });
              const wikiData = await wikiRes.json();
              if (wikiData?.query?.pages) {
                for (const pageId in wikiData.query.pages) {
                  const page = wikiData.query.pages[pageId];
                  const rawUrl = page.thumbnail?.source;
                  if (rawUrl) {
                    const imgUrl = cleanImageUrl(rawUrl);
                    if (imgUrl && isSpecificVenueImage(name, page.title || '')) venueImages.push(imgUrl);
                  }
                }
              }
            } catch { /* ignore */ }
          }

          // D. Wikimedia Commons
          if (venueImages.length === 0) {
            try {
              const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=600&format=json&origin=*`;
              const commonsRes = await fetch(commonsUrl, { headers: { 'User-Agent': 'SportsBuddy/1.0' } });
              const commonsData = await commonsRes.json();
              if (commonsData?.query?.pages) {
                for (const pageId in commonsData.query.pages) {
                  const page = commonsData.query.pages[pageId];
                  const rawUrl = page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url;
                  if (rawUrl) {
                    const imgUrl = cleanImageUrl(rawUrl);
                    const lower = imgUrl.toLowerCase();
                    if (imgUrl &&
                      (lower.endsWith('.jpg') || lower.endsWith('.png') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) &&
                      isSpecificVenueImage(name, page.title || '')
                    ) venueImages.push(imgUrl);
                  }
                }
              }
            } catch { /* ignore */ }
          }

          if (venueImages.length > 0) {
            VENUE_IMAGE_CACHE.set(cacheKey, venueImages);
            try { await AsyncStorage.setItem(CACHE_KEY_PREFIX + cacheKey, JSON.stringify(venueImages)); } catch { /* ignore */ }
          }
        }
      }

      return {
        name,
        distance: distanceText || hashDistance(name),
        distanceMeters: distanceMeters || Math.floor(Math.random() * 5000) + 1000,
        images: venueImages,
        type,
      };
    });

    const results = await Promise.all(processPromises);
    const sorted = results.sort((a, b) => {
      if (a.distanceMeters === undefined) return 1;
      if (b.distanceMeters === undefined) return -1;
      return a.distanceMeters - b.distanceMeters;
    });

    console.log('[AIService Logger] Sorted location suggestions:', sorted);
    return sorted;
  },

  calculateCompatibility(user1: Partial<User>, user2: Partial<User>): number {
    return compatibilityService.calculateCompatibility(user1, user2);
  },

  getCompatibilityDetails(user1: Partial<User>, user2: Partial<User>) {
    return compatibilityService.getCompatibilityDetails(user1, user2);
  },

  async getPersonalizedHomeFeed(user: Partial<User>): Promise<PersonalizedHomeFeed> {
    const [recommendedTeammates, eventRecommendations, suggestedSports] = await Promise.all([
      this.getTeammateRecommendations(user),
      this.getRecommendedEvents(user),
      this.getSportRecommendations(user),
    ]);
    return {
      recommendedTeammates,
      trendingMatches: eventRecommendations
        .filter((item) => item.event.currentPlayers >= Math.max(2, item.event.maxPlayers * 0.5))
        .slice(0, 5),
      nearbyGames: eventRecommendations
        .filter((item) => item.factors.some((factor) => factor.key === 'distance' && factor.score >= 55))
        .slice(0, 5),
      suggestedSports,
      curatedEvents: eventRecommendations.slice(0, 8),
      generatedAt: new Date(),
    };
  },

  async trackUserBehavior(signal: BehaviorSignal): Promise<void> {
    await userBehaviorService.trackBehaviorEvent(signal);
    recommendationService.clearCache(signal.userId);
    eventSuggestionService.clearCache(signal.userId);
  },

  subscribeToRecommendations(
    user: Partial<User>,
    callback: (recommendations: AIRecommendation[]) => void
  ) {
    if (!user.uid) { callback([]); return () => undefined; }
    return recommendationService.subscribeToStoredRecommendations(user.uid, callback);
  },

  subscribeToEventRecommendations: eventSuggestionService.subscribeToEventRecommendations,
  chat: chatService,
};

export * from './aiTypes';
export { compatibilityService } from './compatibilityService';
export { eventSuggestionService } from './eventSuggestionService';
export { recommendationService } from './recommendationService';
export { scoringEngine } from './scoringEngine';
export { userBehaviorService } from './userBehaviorService';
export { promptService } from './promptService';
export { chatService } from './chatService';
export { aiClient } from './aiClient';
export { assistantPrompts } from './assistantPrompts';
export { compatibilityEngine } from './compatibilityEngine';
