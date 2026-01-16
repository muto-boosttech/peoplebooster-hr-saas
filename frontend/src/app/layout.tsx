import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PeopleBooster - HR SaaS Platform',
    template: '%s | PeopleBooster',
  },
  description:
    '科学的な性格診断と複数の評価軸を組み合わせ、求職者の性格傾向を多角的に分析し、組織とのマッチ度を定量化するHR SaaSソリューション',
  keywords: ['HR', 'SaaS', '性格診断', '採用管理', 'ATS', '人材マッチング'],
  authors: [{ name: 'PeopleBooster Team' }],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://peoplebooster.com',
    siteName: 'PeopleBooster',
    title: 'PeopleBooster - HR SaaS Platform',
    description:
      '科学的な性格診断と複数の評価軸を組み合わせ、求職者の性格傾向を多角的に分析し、組織とのマッチ度を定量化するHR SaaSソリューション',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable}`}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#059669',
              },
            },
            error: {
              style: {
                background: '#dc2626',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
