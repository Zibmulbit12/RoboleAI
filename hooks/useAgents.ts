import { useState, useEffect } from 'react';

export interface AgentConfig {
    id: string;
    name: string;
    instruction: string;
    icon: string;
    tools: string[];
    temperature: number;
    topP: number;
    topK: number;
    maxTokens: number;
}

const AGENTS_STORAGE_KEY = 'ai_agents';

export const useAgents = () => {
    const [agents, setAgents] = useState<AgentConfig[]>(() => {
        try {
            const storedAgents = localStorage.getItem(AGENTS_STORAGE_KEY);
            return storedAgents ? JSON.parse(storedAgents) : [];
        } catch (error) {
            console.error("Error reading agents from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
        } catch (error) {
            console.error("Error saving agents to localStorage", error);
        }
    }, [agents]);

    const addAgent = (config: Omit<AgentConfig, 'id'>, returnAgent: boolean = false): AgentConfig | void => {
        const newAgent: AgentConfig = {
            ...config,
            id: `agent_${new Date().getTime()}`
        };
        setAgents(prev => [...prev, newAgent]);
        if(returnAgent) return newAgent;
    };

    const updateAgent = (id: string, updatedConfig: Omit<AgentConfig, 'id'>) => {
        setAgents(prev =>
            prev.map(agent => (agent.id === id ? { ...updatedConfig, id } : agent))
        );
    };

    const deleteAgent = (id: string) => {
        if (confirm('Czy na pewno chcesz usunąć tego agenta?')) {
            setAgents(prev => prev.filter(agent => agent.id !== id));
        }
    };
    
    return { agents, addAgent, updateAgent, deleteAgent };
};