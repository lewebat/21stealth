import { cn } from '@lib/utils'
import { CHAIN_BADGE } from '@utils/chains'

export function ChainBadge({ chain, className }) {
  return (
    <span className={cn('chain-badge', className ?? (CHAIN_BADGE[chain] ?? 'bg-surface'))}>
      {chain.toUpperCase()}
    </span>
  )
}
