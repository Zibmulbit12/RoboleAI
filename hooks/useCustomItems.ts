import { useState, useEffect, useCallback } from 'react';

// Re-export LibraryItem for consistency, but without the 'icon' component property which is not serializable.
export interface LibraryItemBase {
    id: string;
    name: string;
    description: string;
    iconName: string;
    type: 'tool' | 'node';
    isCustom: boolean;
    inputs?: {
        key: string;
        label: string;
        type: 'text' | 'number' | 'textarea';
        defaultValue?: string | number;
        placeholder?: string;
    }[];
}

export interface CustomItem extends LibraryItemBase {
    isCustom: true;
    // For tools
    functionName?: string;
    functionDescription?: string;
    parameters?: {
        name: string;
        type: string;
        description: string;
    }[];
    executionCode?: string;
}

const CUSTOM_ITEMS_STORAGE_KEY = 'ai_custom_library_items';

export const useCustomeItems = () => {
    const [customItems, setCustomItems] = useState<CustomItem[]>(() => {
        try {
            const storedItems = localStorage.getItem(CUSTOM_ITEMS_STORAGE_KEY);
            return storedItems ? JSON.parse(storedItems) : [];
        } catch (error) {
            console.error("Error reading custom items from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(customItems));
        } catch (error) {
            console.error("Error saving custom items to localStorage", error);
        }
    }, [customItems]);

    const addCustomItem = useCallback((item: Omit<CustomItem, 'id' | 'isCustom'>, returnItem: boolean = false): CustomItem | void => {
        const newItem: CustomItem = {
            ...item,
            id: `custom_${new Date().getTime()}`,
            isCustom: true,
        };
        setCustomItems(prev => [...prev, newItem]);
        if (returnItem) return newItem;
    }, []);

    const deleteCustomItem = useCallback((id: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten niestandardowy element?')) {
            setCustomItems(prev => prev.filter(item => item.id !== id));
        }
    }, []);

    return { customItems, addCustomItem, deleteCustomItem };
};