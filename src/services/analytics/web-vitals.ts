import type { WebVitalName, WebVitalRating } from '@/services/analytics/events';
import { trackWebVitalMetric } from '@/services/analytics/tracker';

type MetricValue = {
  value: number | null;
  unit: 'ms' | 'score';
};

const DEFAULT_METRICS: Record<WebVitalName, MetricValue> = {
  lcp: { value: null, unit: 'ms' },
  cls: { value: null, unit: 'score' },
  inp: { value: null, unit: 'ms' },
};

const rateMetric = (name: WebVitalName, value: number | null): WebVitalRating => {
  if (value === null || Number.isNaN(value)) {
    return 'unavailable';
  }

  if (name === 'lcp') {
    if (value <= 2500) {
      return 'good';
    }
    if (value <= 4000) {
      return 'needs-improvement';
    }
    return 'poor';
  }

  if (name === 'cls') {
    if (value <= 0.1) {
      return 'good';
    }
    if (value <= 0.25) {
      return 'needs-improvement';
    }
    return 'poor';
  }

  if (value <= 200) {
    return 'good';
  }
  if (value <= 500) {
    return 'needs-improvement';
  }
  return 'poor';
};

const roundMetric = (value: number | null): number => {
  if (value === null || Number.isNaN(value)) {
    return -1;
  }
  return Math.round(value * 100) / 100;
};

export const startPublicWebVitalsTracking = (path: string): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const hasPerformanceObserver =
    typeof window.PerformanceObserver === 'function' &&
    typeof window.PerformanceObserver.supportedEntryTypes !== 'undefined';

  const metrics: Record<WebVitalName, MetricValue> = {
    lcp: { ...DEFAULT_METRICS.lcp },
    cls: { ...DEFAULT_METRICS.cls },
    inp: { ...DEFAULT_METRICS.inp },
  };
  const interactionDurations = new Map<number, number>();

  let flushed = false;
  const observers: PerformanceObserver[] = [];

  const flush = () => {
    if (flushed) {
      return;
    }
    flushed = true;

    (Object.keys(metrics) as WebVitalName[]).forEach((name) => {
      if (name === 'inp' && interactionDurations.size > 0) {
        const worstInteractionDuration = Math.max(...interactionDurations.values());
        metrics.inp.value = worstInteractionDuration;
      }

      const metric = metrics[name];
      trackWebVitalMetric({
        path,
        name,
        value: roundMetric(metric.value),
        rating: rateMetric(name, metric.value),
        unit: metric.unit,
      });
    });
  };

  if (!hasPerformanceObserver) {
    flush();
    return () => {};
  }

  const observerSafe = (entryType: string, callback: (entries: PerformanceEntryList) => void): void => {
    try {
      const observer = new PerformanceObserver((list) => callback(list));
      observer.observe({ type: entryType, buffered: true });
      observers.push(observer);
    } catch {
      // Keep tracking non-blocking.
    }
  };

  observerSafe('largest-contentful-paint', (entries) => {
    const last = entries.getEntries().at(-1);
    if (last) {
      metrics.lcp.value = last.startTime;
    }
  });

  observerSafe('layout-shift', (entries) => {
    entries.getEntries().forEach((entry) => {
      const layoutShift = entry as PerformanceEntry & {
        value?: number;
        hadRecentInput?: boolean;
      };
      if (layoutShift.hadRecentInput) {
        return;
      }
      const nextValue = (metrics.cls.value ?? 0) + (layoutShift.value ?? 0);
      metrics.cls.value = nextValue;
    });
  });

  observerSafe('event', (entries) => {
    entries.getEntries().forEach((entry) => {
      const eventEntry = entry as PerformanceEntry & {
        duration?: number;
        interactionId?: number;
      };
      const duration = eventEntry.duration ?? 0;
      const interactionId = eventEntry.interactionId ?? 0;

      if (interactionId > 0) {
        const previousDuration = interactionDurations.get(interactionId) ?? 0;
        if (duration > previousDuration) {
          interactionDurations.set(interactionId, duration);
        }
        return;
      }

      const fallbackDuration = metrics.inp.value ?? 0;
      if (duration > fallbackDuration) {
        metrics.inp.value = duration;
      }
    });
  });

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange, { once: true });
  window.addEventListener('pagehide', flush, { once: true });
  const timeoutId = window.setTimeout(flush, 1500);

  return () => {
    window.clearTimeout(timeoutId);
    observers.forEach((observer) => observer.disconnect());
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', flush);
    flush();
  };
};
