import { useEffect } from 'react';
import { trackSeoAudit } from '@/services/analytics/tracker';

type PublicSeoConfig = {
  title: string;
  description: string;
  path: string;
  robots?: string;
};

const normalizeSiteUrl = (value: string): string => value.replace(/\/+$/, '');

const resolveSeoBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return normalizeSiteUrl(window.location.origin);
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VITE_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) {
    return normalizeSiteUrl(configuredSiteUrl);
  }

  return 'http://localhost';
};

const getCanonicalUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, `${resolveSeoBaseUrl()}/`).toString();
};

const upsertMeta = (name: string, content: string): void => {
  const selector = `meta[name="${name}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  const element = existing ?? document.createElement('meta');

  if (!existing) {
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
};

const upsertCanonical = (href: string): void => {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const element = existing ?? document.createElement('link');

  if (!existing) {
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
};

export const usePublicSeo = ({ title, description, path, robots = 'index,follow' }: PublicSeoConfig): void => {
  useEffect(() => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const canonicalUrl = getCanonicalUrl(path);

    document.title = normalizedTitle;
    upsertMeta('description', normalizedDescription);
    upsertMeta('robots', robots);
    upsertCanonical(canonicalUrl);

    const titlePresent = document.title.trim().length > 0;
    const descriptionPresent =
      (document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content.trim().length ?? 0) > 0;
    const canonicalPresent = (document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href.length ?? 0) > 0;
    const robotsPresent = (document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content.trim().length ?? 0) > 0;
    const h1Count = document.querySelectorAll('h1').length;

    trackSeoAudit({
      path,
      titlePresent,
      descriptionPresent,
      canonicalPresent,
      robotsPresent,
      h1Count,
    });
  }, [description, path, robots, title]);
};
