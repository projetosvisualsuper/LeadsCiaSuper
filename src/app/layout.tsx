import type { Metadata } from "next";
import ClientLayout from "./client-layout";
import "./globals.css";
import { api } from "@/services/api";
import Script from "next/script";


export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Leads Cia Super | CRM & E-mail Marketing",
    description: "Gerenciamento inteligente de leads e campanhas",
    icons: {
      icon: "/api/img/favicon",
      apple: "/api/img/favicon",
    },
    openGraph: {
      title: "Leads Cia Super | CRM & E-mail Marketing",
      description: "Gerenciamento inteligente de leads e campanhas",
      images: [{ url: "/api/img/og-logo" }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      images: ["/api/img/og-logo"],
    }
  };
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
