import { useState, useEffect, useCallback } from 'react';
import { AgentConfig } from './useAgents';
import { LibraryItem } from '../pages/NarzedziaIWezly';

// Define the core types for the schema
export type SchemaItemType = 'agent' | 'tool' | 'node';

export interface SchemaItem {
    id: string; // Unique ID for the item on the canvas
    baseId: string; // Original ID from library, e.g., 'get_input'
    type: SchemaItemType;
    name: string; // Base name from library, e.g., 'Dane wejściowe'
    iconName: string; 
    position: { x: number; y: number };
    data?: Record<string, any>; // To store user-configured data
}

export interface Connection {
    id: string;
    from: string; // id of the source SchemaItem
    to: string; // id of the target SchemaItem
}

export interface SchemaState {
    items: SchemaItem[];
    connections: Connection[];
}

const SCHEMA_STORAGE_KEY = 'ai_schema_v2'; // New key to avoid conflicts with old structure

const initialSchemaState: SchemaState = {
    items: [],
    connections: [],
};

export const useSchema = () => {
    const [schema, setSchema] = useState<SchemaState>(() => {
        try {
            const storedSchema = localStorage.getItem(SCHEMA_STORAGE_KEY);
            return storedSchema ? JSON.parse(storedSchema) : initialSchemaState;
        } catch (error) {
            console.error("Error reading schema from localStorage", error);
            return initialSchemaState;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(SCHEMA_STORAGE_KEY, JSON.stringify(schema));
        } catch (error) {
            console.error("Error saving schema to localStorage", error);
        }
    }, [schema]);

    const addItemToSchema = useCallback((item: AgentConfig | LibraryItem, data?: Record<string, any>) => {
        setSchema(prev => {
            const isAgent = 'instruction' in item; // Differentiate AgentConfig from LibraryItem
            const baseId = isAgent ? item.id : item.id;
            
            // Prevent adding the same logical agent multiple times
            if (isAgent && prev.items.some(i => i.baseId === baseId)) {
                alert("Ten agent jest już na schemacie.");
                return prev;
            }

            // For library items, create a unique instance ID to allow multiple instances
            const newId = isAgent ? baseId : `${baseId}_${new Date().getTime()}`;

            const newItem: SchemaItem = {
                id: newId,
                baseId: baseId,
                type: isAgent ? 'agent' : item.type,
                name: item.name,
                iconName: isAgent ? item.icon : item.iconName,
                position: { x: 50 + Math.random() * 150, y: 50 + Math.random() * 100 },
                data: data || {},
            };

            return { ...prev, items: [...prev.items, newItem] };
        });
    }, []);

    const removeItemFromSchema = useCallback((itemId: string) => {
        setSchema(prev => ({
            items: prev.items.filter(item => item.id !== itemId),
            connections: prev.connections.filter(conn => conn.from !== itemId && conn.to !== itemId),
        }));
    }, []);

    const updateItemPosition = useCallback((id: string, dx: number, dy: number) => {
        setSchema(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === id
                    ? { ...item, position: { x: item.position.x + dx, y: item.position.y + dy } }
                    : item
            )
        }));
    }, []);
    
    const addConnection = useCallback((fromId: string, toId: string) => {
        setSchema(prev => {
            // Prevent connecting to self, duplicate connections, or reverse connections
            if (fromId === toId || 
                prev.connections.some(c => (c.from === fromId && c.to === toId) || (c.from === toId && c.from === fromId))) {
                return prev;
            }
            const newConnection: Connection = {
                id: `conn_${fromId}_${toId}`,
                from: fromId,
                to: toId,
            };
            return { ...prev, connections: [...prev.connections, newConnection] };
        });
    }, []);

    const clearSchema = useCallback(() => {
        if (window.confirm('Czy na pewno chcesz wyczyścić cały schemat? Ta akcja jest nieodwracalna.')) {
            setSchema(initialSchemaState);
        }
    }, []);
    
    const loadSchema = useCallback((newSchema: SchemaState, force: boolean = false): boolean => {
        if (force || window.confirm('Wczytanie projektu nadpisze Twój obecny, niezapisany schemat. Czy chcesz kontynuować?')) {
            setSchema(newSchema);
            return true;
        }
        return false;
    }, [setSchema]);
    
    return { schema, addItemToSchema, updateItemPosition, removeItemFromSchema, clearSchema, addConnection, loadSchema };
};