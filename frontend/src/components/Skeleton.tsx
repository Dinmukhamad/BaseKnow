// src/components/Skeleton.tsx

interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: string
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, radius = 'var(--radius-md)', style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

export function ArticleCardSkeleton() {
  return (
    <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Skeleton width={16} height={16} radius="var(--radius-sm)" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="25%" height={12} />
        </div>
        <Skeleton width={64} height={22} radius="var(--radius-full)" />
        <Skeleton width={100} height={14} />
      </div>
    </div>
  )
}

export function ArticleSkeletonPage() {
  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 800 }}>
      <Skeleton width="40%" height={14} style={{ marginBottom: 'var(--space-5)' }} />
      <Skeleton width="75%" height={36} style={{ marginBottom: 'var(--space-3)' }} />
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <Skeleton width={80} height={22} radius="var(--radius-full)" />
        <Skeleton width={120} height={22} radius="var(--radius-full)" />
      </div>
      <Skeleton height={1} radius="0" style={{ marginBottom: 'var(--space-6)' }} />
      {[...Array(8)].map((_, i) => (
        <Skeleton
          key={i}
          width={i % 3 === 2 ? '50%' : i % 2 === 0 ? '100%' : '85%'}
          height={16}
          style={{ marginBottom: 'var(--space-3)' }}
        />
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card card-pad">
      <Skeleton width={40} height={40} radius="var(--radius-lg)" style={{ marginBottom: 'var(--space-3)' }} />
      <Skeleton width="60%" height={28} style={{ marginBottom: 'var(--space-2)' }} />
      <Skeleton width="80%" height={14} style={{ marginBottom: 'var(--space-1)' }} />
      <Skeleton width="50%" height={12} />
    </div>
  )
}
