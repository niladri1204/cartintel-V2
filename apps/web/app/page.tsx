export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero Section */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-6xl font-extrabold tracking-tight">
          CartIntel
        </h1>

        <p className="mt-6 max-w-2xl text-xl text-gray-600">
          AI-Powered Shopping Intelligence Platform
        </p>

        <p className="mt-4 max-w-3xl text-lg text-gray-500">
          Compare prices across marketplaces, understand products with AI,
          analyze reviews, and always know the smartest place to buy.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="rounded-xl bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800">
            Install Extension
          </button>

          <button className="rounded-xl border border-gray-300 px-6 py-3 font-medium transition hover:bg-gray-100">
            Learn More
          </button>
        </div>
      </section>
    </main>
  );
} 