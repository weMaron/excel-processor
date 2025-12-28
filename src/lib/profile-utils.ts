import { FilterRule } from '@/components/FilterBuilder';
import { ColumnConfig } from '@/components/ColumnMapper';

export interface UnifiedProfile {
    id?: string;
    name: string;
    headers: string[]; // For auto-matching
    mapping: ColumnConfig[];
    filters: FilterRule[];
    aiInstruction: string;
    reportSettings: {
        groupBy: string;
        selectedColumns: string[];
        headerText: string;
    };
    updatedAt?: { seconds: number };
}

export const saveProfile = async (profile: Partial<UnifiedProfile>) => {
    const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'save',
            id: profile.id,
            name: profile.name,
            data: profile
        }),
    });
    if (!response.ok) throw new Error('Failed to save profile');
    return await response.json();
};

export const getProfiles = async (): Promise<UnifiedProfile[]> => {
    const response = await fetch('/api/profiles');
    if (!response.ok) throw new Error('Failed to fetch profiles');
    return await response.json();
};

export const deleteProfile = async (id: string) => {
    const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'delete',
            id
        }),
    });
    if (!response.ok) throw new Error('Failed to delete profile');
};

// Debounce helper for auto-save
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
