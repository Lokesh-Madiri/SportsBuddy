import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../constants';
import type {
  AttendanceStatus,
  ReputationLevel,
  ReputationMetrics,
  ReviewRole,
  UserRatingAggregate,
  UserReview,
} from '../utils/types';

export type ReviewInput = {
  matchId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  revieweeId: string;
  revieweeName: string;
  role: ReviewRole;
  rating: number;
  sportsmanship: number;
  punctuality: number;
  comment: string;
  tags: string[];
};

const DEFAULT_AI_SIGNALS = {
  trustScoreReady: false,
  behaviorVectorVersion: 'v1',
  flags: [],
};

export const reputationService = {
  async submitReview(input: ReviewInput): Promise<string> {
    const reviewRef = doc(collection(db, FIRESTORE_COLLECTIONS.REVIEWS));
    const ratingRef = doc(db, FIRESTORE_COLLECTIONS.USER_RATINGS, input.revieweeId);
    const metricsRef = doc(db, FIRESTORE_COLLECTIONS.REPUTATION_METRICS, input.revieweeId);
    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, input.revieweeId);

    await runTransaction(db, async (transaction) => {
      const [ratingSnap, metricsSnap] = await Promise.all([
        transaction.get(ratingRef),
        transaction.get(metricsRef),
      ]);

      const existingRating = normalizeRatingAggregate(input.revieweeId, ratingSnap.data());
      const existingMetrics = normalizeMetrics(input.revieweeId, metricsSnap.data());
      const nextRating = buildNextRatingAggregate(existingRating, input);
      const nextMetrics = buildNextMetrics(existingMetrics, {
        averageRating: nextRating.averageRating,
        reviewCount: nextRating.totalReviews,
        sportsmanshipScore: nextRating.sportsmanshipAverage,
        punctualityScore: rollingAverage(
          existingMetrics.punctualityScore,
          existingMetrics.reviewCount,
          input.punctuality
        ),
      });

      transaction.set(reviewRef, {
        ...input,
        createdAt: serverTimestamp(),
        aiSignals: DEFAULT_AI_SIGNALS,
      });
      transaction.set(ratingRef, {
        ...nextRating,
        lastReviewAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.set(metricsRef, {
        ...nextMetrics,
        updatedAt: serverTimestamp(),
      });
      transaction.set(userRef, {
        rating: nextMetrics.averageRating,
        reviewCount: nextMetrics.reviewCount,
        reputation: nextMetrics,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    return reviewRef.id;
  },

  async getReputationMetrics(userId: string): Promise<ReputationMetrics> {
    const ref = doc(db, FIRESTORE_COLLECTIONS.REPUTATION_METRICS, userId);
    const snap = await getDoc(ref);
    return normalizeMetrics(userId, snap.data());
  },

  async getRecentReviews(userId: string, count = 5): Promise<UserReview[]> {
    const q = query(
      collection(db, FIRESTORE_COLLECTIONS.REVIEWS),
      where('revieweeId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((reviewDoc) => normalizeReview(reviewDoc.id, reviewDoc.data()));
  },

  async getProfileTrustSnapshot(userId: string): Promise<{
    metrics: ReputationMetrics;
    recentReviews: UserReview[];
  }> {
    const [metrics, recentReviews] = await Promise.all([
      this.getReputationMetrics(userId),
      this.getRecentReviews(userId, 3),
    ]);
    return { metrics, recentReviews };
  },

  async trackAttendance(userId: string, status: AttendanceStatus): Promise<void> {
    const metricsRef = doc(db, FIRESTORE_COLLECTIONS.REPUTATION_METRICS, userId);
    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(metricsRef);
      const existing = normalizeMetrics(userId, snap.data());
      const attendance = {
        ...existing.attendance,
        attended: existing.attendance.attended + (status === 'attended' ? 1 : 0),
        missed: existing.attendance.missed + (status === 'missed' ? 1 : 0),
        late: existing.attendance.late + (status === 'late' ? 1 : 0),
        cancellations: existing.attendance.cancellations + (status === 'cancelled' ? 1 : 0),
        totalTracked: existing.attendance.totalTracked + 1,
      };
      const next = buildNextMetrics({ ...existing, attendance }, {});

      transaction.set(metricsRef, {
        ...next,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      transaction.set(userRef, {
        reputation: next,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
  },

  async seedReputationMetrics(userId: string): Promise<void> {
    const ref = doc(db, FIRESTORE_COLLECTIONS.REPUTATION_METRICS, userId);
    await setDoc(ref, {
      ...normalizeMetrics(userId),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },
};

function buildNextRatingAggregate(
  existing: UserRatingAggregate,
  input: ReviewInput
): UserRatingAggregate {
  const totalReviews = existing.totalReviews + 1;
  const teammateReviewCount = existing.teammateReviewCount + (input.role === 'teammate' ? 1 : 0);
  const organizerReviewCount = existing.organizerReviewCount + (input.role === 'organizer' ? 1 : 0);

  return {
    ...existing,
    averageRating: rollingAverage(existing.averageRating, existing.totalReviews, input.rating),
    totalReviews,
    teammateAverage:
      input.role === 'teammate'
        ? rollingAverage(existing.teammateAverage, existing.teammateReviewCount, input.rating)
        : existing.teammateAverage,
    teammateReviewCount,
    organizerAverage:
      input.role === 'organizer'
        ? rollingAverage(existing.organizerAverage, existing.organizerReviewCount, input.rating)
        : existing.organizerAverage,
    organizerReviewCount,
    sportsmanshipAverage: rollingAverage(
      existing.sportsmanshipAverage,
      existing.totalReviews,
      input.sportsmanship
    ),
    updatedAt: new Date(),
  };
}

function buildNextMetrics(
  existing: ReputationMetrics,
  updates: Partial<Pick<
    ReputationMetrics,
    'averageRating' | 'reviewCount' | 'sportsmanshipScore' | 'punctualityScore'
  >>
): ReputationMetrics {
  const attendanceRate = calculateAttendanceRate(existing.attendance);
  const cancellationRate = calculateCancellationRate(existing.attendance);
  const reliabilityScore = calculateReliability(existing.attendance, updates.punctualityScore ?? existing.punctualityScore);
  const sportsmanshipScore = updates.sportsmanshipScore ?? existing.sportsmanshipScore;
  const averageRating = updates.averageRating ?? existing.averageRating;
  const reviewCount = updates.reviewCount ?? existing.reviewCount;
  const communityScore = calculateCommunityScore({
    averageRating,
    sportsmanshipScore,
    reliabilityScore,
    reviewCount,
  });
  const trustLevel = getTrustLevel(communityScore, reviewCount);

  return {
    ...existing,
    averageRating,
    reviewCount,
    sportsmanshipScore,
    reliabilityScore,
    punctualityScore: updates.punctualityScore ?? existing.punctualityScore,
    attendanceRate,
    cancellationRate,
    communityScore,
    trustLevel,
    trustedBadge: trustLevel === 'trusted' || trustLevel === 'elite',
    updatedAt: new Date(),
  };
}

function calculateAttendanceRate(attendance: ReputationMetrics['attendance']): number {
  if (!attendance.totalTracked) return 100;
  return roundPercentage(((attendance.attended + attendance.late * 0.75) / attendance.totalTracked) * 100);
}

function calculateCancellationRate(attendance: ReputationMetrics['attendance']): number {
  if (!attendance.totalTracked) return 0;
  return roundPercentage((attendance.cancellations / attendance.totalTracked) * 100);
}

function calculateReliability(
  attendance: ReputationMetrics['attendance'],
  punctualityScore: number
): number {
  const attendanceScore = calculateAttendanceRate(attendance);
  const cancellationPenalty = calculateCancellationRate(attendance);
  return clamp(Math.round(attendanceScore * 0.5 + punctualityScore * 0.35 + (100 - cancellationPenalty) * 0.15));
}

function calculateCommunityScore(input: {
  averageRating: number;
  sportsmanshipScore: number;
  reliabilityScore: number;
  reviewCount: number;
}): number {
  const ratingScore = (input.averageRating / 5) * 100;
  const volumeConfidence = Math.min(1, input.reviewCount / 12);
  const rawScore = ratingScore * 0.35 + input.sportsmanshipScore * 0.25 + input.reliabilityScore * 0.3 + volumeConfidence * 10;
  return clamp(Math.round(rawScore));
}

function getTrustLevel(communityScore: number, reviewCount: number): ReputationLevel {
  if (reviewCount >= 20 && communityScore >= 88) return 'elite';
  if (reviewCount >= 5 && communityScore >= 75) return 'trusted';
  if (reviewCount >= 2 && communityScore >= 60) return 'rising';
  return 'new';
}

function normalizeRatingAggregate(userId: string, data?: Record<string, unknown>): UserRatingAggregate {
  return {
    userId,
    averageRating: Number(data?.averageRating || 0),
    totalReviews: Number(data?.totalReviews || 0),
    teammateAverage: Number(data?.teammateAverage || 0),
    teammateReviewCount: Number(data?.teammateReviewCount || 0),
    organizerAverage: Number(data?.organizerAverage || 0),
    organizerReviewCount: Number(data?.organizerReviewCount || 0),
    sportsmanshipAverage: Number(data?.sportsmanshipAverage || 0),
    lastReviewAt: toDate(data?.lastReviewAt),
    updatedAt: toDate(data?.updatedAt) || new Date(),
  };
}

function normalizeMetrics(userId: string, data?: Record<string, unknown>): ReputationMetrics {
  const attendance = data?.attendance as ReputationMetrics['attendance'] | undefined;
  return {
    userId,
    averageRating: Number(data?.averageRating || 0),
    reviewCount: Number(data?.reviewCount || 0),
    sportsmanshipScore: Number(data?.sportsmanshipScore || 100),
    reliabilityScore: Number(data?.reliabilityScore || 100),
    punctualityScore: Number(data?.punctualityScore || 100),
    attendanceRate: Number(data?.attendanceRate || 100),
    cancellationRate: Number(data?.cancellationRate || 0),
    communityScore: Number(data?.communityScore || 70),
    trustLevel: (data?.trustLevel as ReputationLevel) || 'new',
    trustedBadge: Boolean(data?.trustedBadge || false),
    attendance: {
      attended: Number(attendance?.attended || 0),
      missed: Number(attendance?.missed || 0),
      late: Number(attendance?.late || 0),
      cancellations: Number(attendance?.cancellations || 0),
      totalTracked: Number(attendance?.totalTracked || 0),
    },
    aiSignals: {
      ...DEFAULT_AI_SIGNALS,
      ...((data?.aiSignals as ReputationMetrics['aiSignals'] | undefined) || {}),
    },
    updatedAt: toDate(data?.updatedAt) || new Date(),
  };
}

function normalizeReview(id: string, data: Record<string, unknown>): UserReview {
  return {
    id,
    matchId: String(data.matchId || ''),
    reviewerId: String(data.reviewerId || ''),
    reviewerName: String(data.reviewerName || 'SportsBuddy Player'),
    reviewerAvatar: data.reviewerAvatar ? String(data.reviewerAvatar) : undefined,
    revieweeId: String(data.revieweeId || ''),
    revieweeName: String(data.revieweeName || 'Player'),
    role: (data.role as ReviewRole) || 'teammate',
    rating: Number(data.rating || 0),
    sportsmanship: Number(data.sportsmanship || 0),
    punctuality: Number(data.punctuality || 0),
    comment: String(data.comment || ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    createdAt: toDate(data.createdAt) || new Date(),
    aiSignals: data.aiSignals as UserReview['aiSignals'],
  };
}

function rollingAverage(currentAverage: number, currentCount: number, nextValue: number): number {
  return roundOneDecimal(((currentAverage * currentCount) + nextValue) / Math.max(1, currentCount + 1));
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return undefined;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundPercentage(value: number): number {
  return Math.round(value);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
