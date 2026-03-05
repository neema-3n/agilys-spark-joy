import { useEffect } from 'react';
import { trackVitrineView } from '@/services/analytics/tracker';
import { startPublicWebVitalsTracking } from '@/services/analytics/web-vitals';

export const useTrackPublicPageView = (path: string): void => {
  useEffect(() => {
    trackVitrineView(path);
    const stopTracking = startPublicWebVitalsTracking(path);

    return () => {
      stopTracking();
    };
  }, [path]);
};
