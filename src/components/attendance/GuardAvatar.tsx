import { getInitials } from './types'

interface GuardAvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md'
  className?: string
}

export function GuardAvatar({ name, photoUrl, size = 'md', className = '' }: GuardAvatarProps) {
  const sizeCls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-xs'
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex-shrink-0 overflow-hidden ${sizeCls} ${className}`}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
