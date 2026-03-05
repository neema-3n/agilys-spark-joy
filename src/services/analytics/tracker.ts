import type { PublicCtaRole, PublicCtaSurface } from '@/config/public-cta';
import type {
  ConversionType,
  FunnelAnalyticsEvent,
  FunnelEventName,
  WebVitalName,
  WebVitalRating,
} from '@/services/analytics/events';

type AnalyticsWindow = Window & {
  __agilysAnalyticsEvents?: FunnelAnalyticsEvent[];
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

type TrackEventInput = {
  event: FunnelEventName;
  conversionType?: ConversionType;
  surface?: PublicCtaSurface;
  ctaId?: string;
  ctaRole?: PublicCtaRole;
  targetPath?: string;
  path?: string;
  seoTitle?: boolean;
  seoDescription?: boolean;
  seoCanonical?: boolean;
  seoRobots?: boolean;
  seoH1Count?: number;
  webVitalName?: WebVitalName;
  webVitalValue?: number;
  webVitalUnit?: 'ms' | 'score';
  webVitalRating?: WebVitalRating;
};

const APP_LANDING_PENDING_KEY = 'agilys.analytics.pendingAppLandingView';

const getAnalyticsWindow = (): AnalyticsWindow | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window as AnalyticsWindow;
};

const normalizePath = (path: string): string => {
  const [withoutHash] = path.split('#');
  return withoutHash;
};

const getCurrentPath = (win: AnalyticsWindow): string =>
  `${win.location.pathname}${win.location.search}${win.location.hash}`;

export const trackEvent = ({
  event,
  conversionType,
  surface,
  ctaId,
  ctaRole,
  targetPath,
  path,
  seoTitle,
  seoDescription,
  seoCanonical,
  seoRobots,
  seoH1Count,
  webVitalName,
  webVitalValue,
  webVitalUnit,
  webVitalRating,
}: TrackEventInput): void => {
  const win = getAnalyticsWindow();
  if (!win) {
    return;
  }

  const payload: FunnelAnalyticsEvent = {
    event,
    timestamp: new Date().toISOString(),
    path: path ?? getCurrentPath(win),
    conversionType,
    surface,
    ctaId,
    ctaRole,
    targetPath,
    seoTitle,
    seoDescription,
    seoCanonical,
    seoRobots,
    seoH1Count,
    webVitalName,
    webVitalValue,
    webVitalUnit,
    webVitalRating,
  };

  try {
    if (!Array.isArray(win.__agilysAnalyticsEvents)) {
      win.__agilysAnalyticsEvents = [];
    }
    win.__agilysAnalyticsEvents.push(payload);

    if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push(payload);
    }

    if (typeof win.gtag === 'function') {
      win.gtag('event', payload.event, payload);
    }

    win.dispatchEvent(new CustomEvent<FunnelAnalyticsEvent>('agilys:analytics', { detail: payload }));
  } catch {
    // Analytics must never block user flows.
  }
};

export const trackVitrineView = (path: string): void => {
  trackEvent({ event: 'vitrine_vue', path });
};

export const trackCtaClick = ({
  role,
  surface,
  ctaId,
  targetPath,
}: {
  role: PublicCtaRole;
  surface: PublicCtaSurface;
  ctaId: string;
  targetPath: string;
}): void => {
  const isPrimary = role === 'primary';
  const targetPathname = normalizePath(targetPath).split('?')[0];
  const isLeadConversion = !isPrimary && targetPathname === '/contact';

  trackEvent({
    event: isPrimary ? 'cta_principal_click' : 'cta_secondaire_click',
    conversionType: isPrimary ? 'auth' : isLeadConversion ? 'lead' : undefined,
    surface,
    ctaId,
    ctaRole: role,
    targetPath,
  });
};

export const trackAuthPageView = (): void => {
  trackEvent({ event: 'auth_page_view', conversionType: 'auth' });
};

export const trackAuthSuccess = (targetPath: string): void => {
  trackEvent({ event: 'auth_success', conversionType: 'auth', targetPath });
};

export const markPendingAppLandingView = (targetPath: string): void => {
  const win = getAnalyticsWindow();
  if (!win) {
    return;
  }

  try {
    win.sessionStorage.setItem(APP_LANDING_PENDING_KEY, normalizePath(targetPath));
  } catch {
    // Ignore storage failures and keep auth flow unaffected.
  }
};

export const trackAppLandingViewIfPending = (currentPath: string): boolean => {
  const win = getAnalyticsWindow();
  if (!win) {
    return false;
  }

  try {
    const pendingPath = win.sessionStorage.getItem(APP_LANDING_PENDING_KEY);
    if (!pendingPath) {
      return false;
    }

    if (normalizePath(currentPath) !== pendingPath) {
      return false;
    }

    win.sessionStorage.removeItem(APP_LANDING_PENDING_KEY);
    trackEvent({
      event: 'app_landing_view',
      conversionType: 'auth',
      targetPath: currentPath,
    });

    return true;
  } catch {
    return false;
  }
};

export const trackAppLandingViewForTargetIfPending = (targetPath: string): boolean => {
  const win = getAnalyticsWindow();
  if (!win) {
    return false;
  }

  try {
    const pendingPath = win.sessionStorage.getItem(APP_LANDING_PENDING_KEY);
    if (!pendingPath) {
      return false;
    }

    if (normalizePath(targetPath) !== pendingPath) {
      return false;
    }

    win.sessionStorage.removeItem(APP_LANDING_PENDING_KEY);
    trackEvent({
      event: 'app_landing_view',
      conversionType: 'auth',
      targetPath,
    });

    return true;
  } catch {
    return false;
  }
};

export const trackSeoAudit = ({
  path,
  titlePresent,
  descriptionPresent,
  canonicalPresent,
  robotsPresent,
  h1Count,
}: {
  path: string;
  titlePresent: boolean;
  descriptionPresent: boolean;
  canonicalPresent: boolean;
  robotsPresent: boolean;
  h1Count: number;
}): void => {
  trackEvent({
    event: 'seo_audit',
    path,
    seoTitle: titlePresent,
    seoDescription: descriptionPresent,
    seoCanonical: canonicalPresent,
    seoRobots: robotsPresent,
    seoH1Count: h1Count,
  });
};

export const trackWebVitalMetric = ({
  path,
  name,
  value,
  rating,
  unit,
}: {
  path: string;
  name: WebVitalName;
  value: number;
  rating: WebVitalRating;
  unit: 'ms' | 'score';
}): void => {
  trackEvent({
    event: 'web_vital_metric',
    path,
    webVitalName: name,
    webVitalValue: value,
    webVitalRating: rating,
    webVitalUnit: unit,
  });
};
