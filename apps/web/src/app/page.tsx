export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Aura - Private Health Tracking</h1>
        <p className="text-gray-600 mb-6">Your privacy-first reproductive health companion.</p>
        <div className="space-y-3">
          <div className="flex items-center text-green-600">
            <span className="mr-2">🔒</span>
            <span>Zero-knowledge encryption</span>
          </div>
          <div className="flex items-center text-green-600">
            <span className="mr-2">📱</span>
            <span>Local data storage</span>
          </div>
          <div className="flex items-center text-green-600">
            <span className="mr-2">🛡️</span>
            <span>Complete privacy protection</span>
          </div>
        </div>
        <div className="mt-6 text-center text-sm text-gray-500">Web app under development</div>
      </div>
    </div>
  );
}
