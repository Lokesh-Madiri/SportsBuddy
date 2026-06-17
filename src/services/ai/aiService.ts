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
    'svg', 'gif', 'commons', 'wiki', 'wikimedia', 'image', 'photo', 'picture'
  ]);

  const cleanName = venueName.toLowerCase();
  const cleanTitle = imageTitle.toLowerCase().replace(/_/g, ' ');

  // Extract specific identifier words from venue name
  const venueWords = cleanName
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !genericWords.has(w));

  // If there are no specific identifier words, we do not match any image as specific
  if (venueWords.length === 0) {
    return false;
  }

  // Ensure the image title/filename includes at least one specific identifier word
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

    // Google Maps Extractor query and relevance helpers
    const getSportQuerySuffix = (sport: string): string => {
      const s = sport.toLowerCase().trim();
      if (['basketball', 'tennis', 'badminton', 'volleyball'].includes(s)) {
        return 'court';
      }
      if (['swimming'].includes(s)) {
        return 'swimming pool';
      }
      if (['golf'].includes(s)) {
        return 'golf course';
      }
      if (['running', 'cycling'].includes(s)) {
        return 'track';
      }
      return 'ground';
    };

    const isVenueRelevantToSport = (name: string, categories: string[], sport: string): boolean => {
      const n = name.toLowerCase();
      const cats = (categories || []).map(c => c.toLowerCase());
      const s = sport.toLowerCase().trim();

      // Define sport-specific terms
      let sportKeywords = [s];
      if (s === 'soccer') {
        sportKeywords = ['soccer', 'football', 'turf', 'futsal'];
      } else if (s === 'badminton') {
        sportKeywords = ['badminton', 'shuttle'];
      } else if (s === 'swimming') {
        sportKeywords = ['swimming', 'pool'];
      } else if (s === 'running') {
        sportKeywords = ['running', 'track', 'athletics', 'jogging'];
      } else if (s === 'cycling') {
        sportKeywords = ['cycling', 'cycle', 'velodrome'];
      }

      // Check if it matches our selected sport keywords
      const matchesSelectedSport = sportKeywords.some(keyword =>
        n.includes(keyword) || cats.some(cat => cat.includes(keyword))
      );

      // Define other sports' keywords to exclude if they don't contain our selected sport
      const allSportKeywordsMap: Record<string, string[]> = {
        basketball: ['basketball'],
        soccer: ['soccer', 'football', 'turf', 'futsal'],
        tennis: ['tennis'],
        volleyball: ['volleyball'],
        running: ['running', 'track', 'athletics', 'jogging'],
        swimming: ['swimming', 'pool'],
        golf: ['golf'],
        baseball: ['baseball', 'softball'],
        cycling: ['cycling', 'cycle', 'velodrome'],
        badminton: ['badminton', 'shuttle'],
        cricket: ['cricket'],
      };

      // Find keywords for all OTHER sports
      const otherSportsKeywords: string[] = [];
      Object.keys(allSportKeywordsMap).forEach(key => {
        if (key !== s) {
          otherSportsKeywords.push(...allSportKeywordsMap[key]);
        }
      });

      // If it explicitly matches another sport, but does NOT match our selected sport, EXCLUDE it!
      const matchesOtherSport = otherSportsKeywords.some(keyword =>
        n.includes(keyword) || cats.some(cat => cat.includes(keyword))
      );

      if (matchesOtherSport && !matchesSelectedSport) {
        return false;
      }

      // If it matches our sport, keep it
      if (matchesSelectedSport) return true;

      // Otherwise, keep it only if it's a general multi-sports venue
      const generalKeywords = [
        'sports club', 'sports complex', 'sports center', 'sports centre',
        'stadium', 'gymnasium', 'recreation', 'playground', 'park', 'arena', 'club', 'academy'
      ];
      return generalKeywords.some(keyword =>
        n.includes(keyword) || cats.some(cat => cat.includes(keyword))
      );
    };

    // Google Maps Extractor scraper helper functions
    const scrapeGoogleMapsPlaces = async (
      sportName: string,
      cityName: string,
      coords?: Coordinates | null
    ): Promise<{ name: string; lat?: number; lon?: number; type: 'public' | 'private'; address?: string; fid?: string; featuredImage?: string }[]> => {
      const apiKey = process.env.EXPO_PUBLIC_GMAPS_EXTRACTER_KEY || 'RClYow1smdVHyUjCW3YagnbVW8T75HWRRzqI95yQFBngin8s';
      const suffix = getSportQuerySuffix(sportName);
      const payload: any = {
        q: `${sportName} ${suffix}`,
        page: 1,
        hl: 'en',
        gl: 'in',
      };
      if (coords) {
        payload.ll = `@${coords.latitude},${coords.longitude},12z`;
      } else {
        payload.q = `${sportName} ${suffix} in ${cityName}`;
      }

      try {
        const response = await fetch('https://cloud.gmapsextractor.com/api/v2/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.warn('[AIService Logger] Google Maps Extractor Search failed:', response.status);
          return [];
        }

        const resData = await response.json();
        const places = resData?.data || [];

        return places
          .filter((item: any) => isVenueRelevantToSport(item.Name || '', item.Categories || [], sportName))
          .map((item: any) => {
            const isPrivate = item.Categories?.some((cat: string) =>
              ['club', 'academy', 'complex', 'arena', 'stadium', 'indoor', 'private'].some(word => cat.toLowerCase().includes(word))
            ) || item.About?.toLowerCase().includes('booking') || item.About?.toLowerCase().includes('paid');

            return {
              name: item.Name,
              lat: item.Latitude ? parseFloat(item.Latitude) : undefined,
              lon: item.Longitude ? parseFloat(item.Longitude) : undefined,
              type: isPrivate ? 'private' : 'public',
              address: item.Fulladdress,
              fid: item.Fid,
              featuredImage: item['Featured Image'],
            };
          });
      } catch (err) {
        console.error('[AIService Logger] Error scraping Google Maps:', err);
        return [];
      }
    };

    const fetchPlacePhotos = async (fid: string): Promise<string[]> => {
      const apiKey = process.env.EXPO_PUBLIC_GMAPS_EXTRACTER_KEY || 'RClYow1smdVHyUjCW3YagnbVW8T75HWRRzqI95yQFBngin8s';
      try {
        const response = await fetch('https://cloud.gmapsextractor.com/api/v2/photos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ fid, page: 1 }),
        });
        if (!response.ok) return [];
        const resData = await response.json();
        return (resData?.photos || [])
          .map((p: any) => p.photoUrl)
          .filter(Boolean)
          .slice(0, 5);
      } catch (err) {
        console.error('[AIService Logger] Error fetching photos for fid', fid, err);
        return [];
      }
    };

    // 1. Fetch scraper suggestions
    console.log('[AIService Logger] Scraping Google Maps places...');
    const scraped = await scrapeGoogleMapsPlaces(sport, city, userCoords);
    console.log(`[AIService Logger] Scraper returned ${scraped.length} places.`);

    // 2. Query AI suggestions
    let parsedVenues: { name: string; lat: number | undefined; lon: number | undefined; type: 'public' | 'private' }[] = [];
    const prompt = promptService.buildLocationSuggestionPrompt(city, sport);
    console.log(`[AIService Logger] AI Prompt built: "${prompt}"`);

    try {
      console.log(`[AIService Logger] Querying AI client...`);
      const response = await aiClient.generateAssistantResponse({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: 'You are a local sports scout assistant. Suggest real-world sports venues, public parks, municipal grounds, private sports turfs, and clubs for playing the specified sport in the specified city. Rely on your knowledge of local community discussions, Reddit threads, Facebook posts, and forums to recommend active places. For each venue, provide its approximate latitude and longitude coordinates and classify it as "public" (free, municipal, park) or "private" (commercial turf, indoor arena, club, paid booking). Format the output strictly as: Venue Name | Latitude | Longitude | Type, with one venue per line. Do not include bullet points, numbering, or introductory text. Example:\nIndira Gandhi Municipal Stadium | 16.5085 | 80.6472 | public\nVijetha Sports Academy | 16.5201 | 80.6212 | private',
        maxTokens: 350,
        temperature: 0.3,
      });

      console.log(`[AIService Logger] AI response content: "${response.content}"`);
      const lines = response.content
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

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
      console.error(`[AIService Logger] [Error] Failed to fetch AI location suggestions:`, error);
    }

    // 3. Merge Scraped and AI suggestions
    const combinedList: {
      name: string;
      lat?: number;
      lon?: number;
      type: 'public' | 'private';
      address?: string;
      fid?: string;
      featuredImage?: string;
      source: 'scraper' | 'ai';
    }[] = [];

    // Add all scraped
    scraped.forEach(item => {
      combinedList.push({
        ...item,
        source: 'scraper',
      });
    });

    // Add AI suggestions if not duplicate
    parsedVenues.forEach(aiItem => {
      const isDuplicate = combinedList.some(item =>
        item.name.toLowerCase().includes(aiItem.name.toLowerCase()) ||
        aiItem.name.toLowerCase().includes(item.name.toLowerCase())
      );
      if (!isDuplicate) {
        combinedList.push({
          name: aiItem.name,
          lat: aiItem.lat,
          lon: aiItem.lon,
          type: aiItem.type,
          source: 'ai',
        });
      }
    });

    console.log(`[AIService Logger] Merged list contains ${combinedList.length} total venues.`);

    // 4. Process each item (geocoding, distance, photos/images) in parallel
    const processPromises = combinedList.map(async (item, index) => {
      const name = item.name;
      let lat = item.lat;
      let lon = item.lon;
      const type = item.type;
      let distanceText: string | undefined;
      let distanceMeters: number | undefined;
      let venueImages: string[] = [];

      // 4a. If lat/lon are missing and userCoords is available, try geocoding fallback via Nominatim
      if (userCoords && (lat === undefined || lon === undefined)) {
        try {
          console.log(`[AIService Logger] Geocoding fallback triggered for "${name}"...`);
          const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ', ' + city)}&format=json&limit=1`;
          const fetchResponse = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'SportsBuddy/1.0',
            },
          });
          const data = await fetchResponse.json();
          if (data && data[0]) {
            lat = parseFloat(data[0].lat);
            lon = parseFloat(data[0].lon);
          }
        } catch (err) {
          console.error(`[AIService Logger] Geocoding fallback failed for "${name}":`, err);
        }
      }

      // 4b. Calculate distance if coords resolved
      if (userCoords && lat !== undefined && lon !== undefined) {
        const distance = locationService.calculateDistance(userCoords, { latitude: lat, longitude: lon });
        distanceText = distance.readable;
        distanceMeters = distance.meters;
      }

      // 4c. Fetch specific venue images (check cache first)
      const cacheKey = name.toLowerCase().trim();
      const cachedImages = VENUE_IMAGE_CACHE.get(cacheKey);
      if (cachedImages) {
        venueImages = cachedImages;
      } else {
        // Check persistent cache in AsyncStorage
        try {
          const persistentVal = await AsyncStorage.getItem(CACHE_KEY_PREFIX + cacheKey);
          if (persistentVal) {
            const parsed = JSON.parse(persistentVal);
            if (Array.isArray(parsed)) {
              venueImages = parsed;
              VENUE_IMAGE_CACHE.set(cacheKey, venueImages);
            }
          }
        } catch (err) {
          console.error(`[AIService Logger] Failed to read AsyncStorage cache for "${name}":`, err);
        }

        if (venueImages.length === 0) {
          // A. If scraper source & has fid, try scraper Photos API (limit to top 8 to save quota)
          if (item.source === 'scraper' && item.fid && index < 8) {
            console.log(`[AIService Logger] Fetching scraper photos for "${name}" (fid: ${item.fid})...`);
            const scrapedPhotos = await fetchPlacePhotos(item.fid);
            if (scrapedPhotos && scrapedPhotos.length > 0) {
              venueImages = scrapedPhotos;
            }
          }

          // B. Try featuredImage if photos api returned nothing
          if (venueImages.length === 0 && item.featuredImage) {
            venueImages = [item.featuredImage];
          }

          // C. Fallback: Wikipedia Pageimages (primary infobox photos)
          if (venueImages.length === 0) {
            try {
              const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json&origin=*`;
              const wikiResponse = await fetch(wikiUrl, {
                headers: {
                  'User-Agent': 'SportsBuddy/1.0 (contact@sportsbuddy.com)',
                },
              });
              const wikiData = await wikiResponse.json();
              if (wikiData && wikiData.query && wikiData.query.pages) {
                for (const pageId in wikiData.query.pages) {
                  const page = wikiData.query.pages[pageId];
                  const title = page.title || '';
                  const rawImgUrl = page.thumbnail?.source;
                  if (rawImgUrl) {
                    const imgUrl = cleanImageUrl(rawImgUrl);
                    if (imgUrl && isSpecificVenueImage(name, title)) {
                      venueImages.push(imgUrl);
                    }
                  }
                }
              }
            } catch (err) {
              console.error(`[AIService Logger] Wikipedia pageimage fetch failed for "${name}":`, err);
            }
          }

          // D. Fallback: Wikimedia Commons
          if (venueImages.length === 0) {
            try {
              const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=600&format=json&origin=*`;
              const wikiResponse = await fetch(wikiUrl, {
                headers: {
                  'User-Agent': 'SportsBuddy/1.0 (contact@sportsbuddy.com)',
                },
              });
              const wikiData = await wikiResponse.json();
              if (wikiData && wikiData.query && wikiData.query.pages) {
                for (const pageId in wikiData.query.pages) {
                  const page = wikiData.query.pages[pageId];
                  const imgTitle = page.title || '';
                  const rawImgUrl = page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url;
                  if (rawImgUrl) {
                    const imgUrl = cleanImageUrl(rawImgUrl);
                    const lowerImgUrl = imgUrl.toLowerCase();
                    if (
                      imgUrl &&
                      (lowerImgUrl.endsWith('.jpg') || lowerImgUrl.endsWith('.png') || lowerImgUrl.endsWith('.jpeg') || lowerImgUrl.endsWith('.webp')) &&
                      isSpecificVenueImage(name, imgTitle)
                    ) {
                      venueImages.push(imgUrl);
                    }
                  }
                }
              }
            } catch (err) {
              console.error(`[AIService Logger] Commons image fetch failed for "${name}":`, err);
            }
          }

          // Cache the resolved images
          if (venueImages.length > 0) {
            VENUE_IMAGE_CACHE.set(cacheKey, venueImages);
            try {
              await AsyncStorage.setItem(CACHE_KEY_PREFIX + cacheKey, JSON.stringify(venueImages));
            } catch (err) {
              console.error(`[AIService Logger] Failed to save image cache to AsyncStorage for "${name}":`, err);
            }
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

    // Sort by distance
    const sorted = results.sort((a, b) => {
      if (a.distanceMeters === undefined) return 1;
      if (b.distanceMeters === undefined) return -1;
      return a.distanceMeters - b.distanceMeters;
    });

    console.log(`[AIService Logger] Sorted location suggestions:`, sorted);
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
    if (!user.uid) {
      callback([]);
      return () => undefined;
    }

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
