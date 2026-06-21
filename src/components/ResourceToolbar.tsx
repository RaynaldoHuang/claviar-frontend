import { Search } from 'lucide-react'
export function ResourceToolbar({ search, onSearch, filter }: { search: string; onSearch: (value: string) => void; filter?: React.ReactNode }) { return <div className="resource-toolbar"><div className="resource-search"><Search size={16} /><input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search records..." /></div>{filter}</div> }
