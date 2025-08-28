import { useState, useEffect, useCallback } from 'react';
import { SchemaState } from './useSchema';

const PROJECTS_STORAGE_KEY = 'ai_ready_projects';

export interface Project {
    id: string;
    name: string;
    schema: SchemaState;
    createdAt: string;
}

export const useProjects = () => {
    const [projects, setProjects] = useState<Project[]>(() => {
        try {
            const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
            return storedProjects ? JSON.parse(storedProjects) : [];
        } catch (error) {
            console.error("Error reading projects from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
        } catch (error) {
            console.error("Error saving projects to localStorage", error);
        }
    }, [projects]);

    const addProject = useCallback((name: string, schema: SchemaState) => {
        const newProject: Project = {
            id: `project_${new Date().getTime()}`,
            name,
            schema,
            createdAt: new Date().toISOString(),
        };
        setProjects(prev => [newProject, ...prev]);
    }, []);

    const deleteProject = useCallback((id: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć ten projekt? Ta akcja jest nieodwracalna.')) {
            setProjects(prev => prev.filter(p => p.id !== id));
        }
    }, []);

    const getProject = useCallback((id: string): Project | undefined => {
        return projects.find(p => p.id === id);
    }, [projects]);

    return { projects, addProject, deleteProject, getProject };
};