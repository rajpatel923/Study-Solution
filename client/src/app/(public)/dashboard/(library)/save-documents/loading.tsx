// src/app/dashboard/documents/loading.tsx
export default function DocumentsLoading() {
    return (
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="mt-4 md:mt-0 h-10 w-32 bg-gray-200 rounded-lg"></div>
        </div>
        
        {/* Search bar skeleton */}
        <div className="mb-6 space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
          <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
        </div>
        
        {/* Document grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-gray-100 rounded-lg p-4 h-40">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded mr-3"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }