import type { Metadata, Viewport } from 'next';
import './store.css';
import { display, body, header } from '../fonts';
import { AuthProvider } from '@/components/auth-dialog';
import { CommerceProvider } from '@/components/commerce';
import { SiteShell } from '@/components/site-shell';
   import '@/app/globals.css';
export const metadata: Metadata = {
  title: { default: 'Swaadha — Taste That Feels Like Home', template: '%s | Swaadha' },
  description:
    'Authentic flavors and fresh ingredients from our family kitchen to yours. Homemade favorites, lovingly prepared in Bangalore.',
};

export const viewport: Viewport = { themeColor: '#3A0709' };

// Runs before first paint: opts into scroll motion (unless the visitor prefers reduced motion)
// and plays the intro curtain once per browser session.
const boot = `(function(){var d=document.documentElement;try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('motion');if(!sessionStorage.getItem('sw-intro')&&location.pathname==='/'){d.classList.add('intro')}}}catch(e){}})();`;

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${header.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>
        <AuthProvider>
          <CommerceProvider>
            <SiteShell>{children}</SiteShell>
          </CommerceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
