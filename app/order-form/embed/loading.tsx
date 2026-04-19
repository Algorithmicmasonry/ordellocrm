export default function EmbedLoading() {
  return (
    <div className="w-full p-4 md:p-8 bg-white">
      <div className="max-w-md mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
