import { useState, useEffect, useCallback } from 'react';

const KNOWLEDGE_BASE_STORAGE_KEY = 'ai_knowledge_base';

export interface KnowledgeFile {
    name: string;
    type: string;
    size: number;
}

export interface KnowledgeCollection {
    id: string;
    name: string;
    createdAt: string;
    files: KnowledgeFile[];
}

export const useKnowledgeBase = () => {
    const [collections, setCollections] = useState<KnowledgeCollection[]>(() => {
        try {
            const storedCollections = localStorage.getItem(KNOWLEDGE_BASE_STORAGE_KEY);
            return storedCollections ? JSON.parse(storedCollections) : [];
        } catch (error) {
            console.error("Error reading knowledge base from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(collections));
        } catch (error) {
            console.error("Error saving knowledge base to localStorage", error);
        }
    }, [collections]);

    const addCollection = useCallback((name: string, files: File[]) => {
        if (!name.trim()) {
            alert("Nazwa kolekcji nie może być pusta.");
            return;
        }

        const newCollection: KnowledgeCollection = {
            id: `collection_${new Date().getTime()}`,
            name: name.trim(),
            createdAt: new Date().toISOString(),
            files: files.map(file => ({
                name: file.name,
                type: file.type,
                size: file.size,
            })),
        };
        setCollections(prev => [newCollection, ...prev]);
    }, []);

    const deleteCollection = useCallback((id: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć tę kolekcję i wszystkie jej pliki? Ta akcja jest nieodwracalna.')) {
            setCollections(prev => prev.filter(c => c.id !== id));
        }
    }, []);

    return { collections, addCollection, deleteCollection };
};
