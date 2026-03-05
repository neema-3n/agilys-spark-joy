import type { PublicCtaRole, PublicCtaSurface } from '@/config/public-cta';

export type ConversionType = 'auth' | 'lead';

export type FunnelEventName =
  | 'vitrine_vue'
  | 'cta_principal_click'
  | 'cta_secondaire_click'
  | 'auth_page_view'
  | 'auth_success'
  | 'app_landing_view'
  | 'seo_audit'
  | 'web_vital_metric';

export type WebVitalName = 'lcp' | 'cls' | 'inp';
export type WebVitalRating = 'good' | 'needs-improvement' | 'poor' | 'unavailable';

export type FunnelAnalyticsEvent = {
  event: FunnelEventName;
  timestamp: string;
  path: string;
  conversionType?: ConversionType;
  surface?: PublicCtaSurface;
  ctaId?: string;
  ctaRole?: PublicCtaRole;
  targetPath?: string;
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
