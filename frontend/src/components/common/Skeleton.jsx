export function CardSkeleton() {
  return (
    <div className="flex-shrink-0 w-40">
      <div className="skeleton w-40 h-40 rounded-lg mb-2" />
      <div className="skeleton h-3 w-32 rounded mb-1" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  )
}

export function TrackSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="skeleton w-6 h-4 rounded" />
      <div className="skeleton w-10 h-10 rounded" />
      <div className="flex-1">
        <div className="skeleton h-3 w-48 rounded mb-1" />
        <div className="skeleton h-3 w-28 rounded" />
      </div>
      <div className="skeleton h-3 w-10 rounded" />
    </div>
  )
}

export function RowOfCards({ count = 5 }) {
  return (
    <div className="carousel-scroll">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}
