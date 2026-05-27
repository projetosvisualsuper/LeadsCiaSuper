import type { Metadata } from "next";
import ClientLayout from "./client-layout";
import "./globals.css";
import { api } from "@/services/api";
import { headers } from "next/headers";
import Script from "next/script";

export const runtime = 'edge';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await api.getSettings();
    const headerList = await headers();
    const host = headerList.get('host') || 'gerency-leads.vercel.app';
    const protocol = headerList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    
    const ogImageUrl = `${protocol}://${host}/api/img/og-logo`;
    const faviconUrl = `${protocol}://${host}/api/img/favicon`;

    return {
      title: "Leads Cia Super | CRM & E-mail Marketing",
      description: "Gerenciamento inteligente de leads e campanhas",
      icons: {
        icon: faviconUrl,
        apple: faviconUrl,
      },
      openGraph: {
        title: "Leads Cia Super | CRM & E-mail Marketing",
        description: "Gerenciamento inteligente de leads e campanhas",
        images: [{ url: ogImageUrl }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        images: [ogImageUrl],
      }
    };
  } catch (e) {
    return {
      title: "Leads Cia Super | CRM & E-mail Marketing",
      description: "Gerenciamento inteligente de leads e campanhas",
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await api.getSettings().catch(() => null);
  const gtmId = settings?.gtmId;

  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {gtmId && (
          <>
            <Script
              id="gtm-script"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','${gtmId}');
                `,
              }}
            />
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
              />
            </noscript>
          </>
        )}
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
