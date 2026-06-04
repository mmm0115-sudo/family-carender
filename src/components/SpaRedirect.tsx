'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Restores the path saved by public/404.html after GitHub Pages redirects to /
export default function SpaRedirect() {
  const router = useRouter();
  useEffect(() => {
    const redirect = sessionStorage.getItem('redirect');
    if (redirect) {
      sessionStorage.removeItem('redirect');
      if (redirect !== '/' && redirect !== '') {
        router.replace(redirect);
      }
    }
  }, [router]);
  return null;
}
