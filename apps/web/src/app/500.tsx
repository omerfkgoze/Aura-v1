// Custom 500 page to prevent Next.js auto-generation Html import issue
export default function Custom500() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">500</h1>
        <p className="text-xl mb-4">Server Error</p>
        <a href="/" className="text-blue-600 hover:text-blue-800">
          Return Home
        </a>
      </div>
    </div>
  );
}
