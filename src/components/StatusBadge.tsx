import { titleCase } from '@/lib/format'
export function StatusBadge({ status }: { status: string }) { return <span className={`status ${status}`}><i />{titleCase(status)}</span> }
