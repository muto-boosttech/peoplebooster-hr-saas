import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white font-bold">
              PB
            </div>
            <span className="text-xl font-bold text-gray-900">PeopleBooster</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ログイン
            </Link>
            <Link
              href="/register"
              className="btn-primary"
            >
              無料で始める
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4 py-20 text-center">
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          人と組織の最適な
          <br />
          <span className="text-primary-600">マッチングを科学する</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600">
          AIと心理学の知見を融合させた次世代の採用支援プラットフォーム。
          科学的な性格診断と複数の評価軸を組み合わせ、求職者の性格傾向を多角的に分析し、
          組織とのマッチ度を定量化します。
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            無料トライアルを開始
          </Link>
          <Link href="/demo" className="btn-outline px-8 py-3 text-base">
            デモを見る
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            主な機能
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="性格診断システム"
              description="独自の設問セット（90問）による性格特性の分析"
              icon="🧠"
            />
            <FeatureCard
              title="外部診断連携"
              description="MBTI・動物占いの結果を入力・統合"
              icon="🔗"
            />
            <FeatureCard
              title="AIブラッシュアップ"
              description="面接官コメントを学習し診断結果を継続的に更新"
              icon="🤖"
            />
            <FeatureCard
              title="採用管理（ATS）"
              description="選考ステータス管理、面接スケジュール調整を一元化"
              icon="📋"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary-600 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 text-center md:grid-cols-3">
            <StatCard value="30%" label="採用ミスマッチ削減" />
            <StatCard value="20%" label="離職率改善" />
            <StatCard value="25%" label="選考時間短縮" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white text-sm font-bold">
                PB
              </div>
              <span className="font-bold text-gray-900">PeopleBooster</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2026 PeopleBooster. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold">{value}</div>
      <div className="mt-2 text-primary-100">{label}</div>
    </div>
  );
}
