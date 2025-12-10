export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center text-center space-y-8">
        <img
          src="https://github-production-user-asset-6210df.s3.amazonaws.com/150987889/341146911-d34d4ed8-5898-4025-8b18-47d87651ad67.png"
          alt="Three Trees logo"
          className="w-full max-w-xs sm:max-w-md"
        />
        <a
          href="/capture"
          className="inline-block px-4 py-2 bg-green-600 text-white rounded text-lg font-semibold shadow"
        >
          Start
        </a>
      </div>
    </main>
  );
}
