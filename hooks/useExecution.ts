import { useState, useEffect, useCallback } from 'react';

export interface ExecutionEvent {
    nodeId: string;
    nodeName: string;
    status: 'success' | 'error' | 'started';
    message: string;
    timestamp: string;
    data?: any;
}

export interface ExecutionRun {
    id: string;
    startTimestamp: string;
    endTimestamp?: string;
    status: 'running' | 'completed' | 'failed';
    events: ExecutionEvent[];
}

const EXECUTION_LOGS_STORAGE_KEY = 'ai_execution_logs';

export const useExecution = () => {
    const [runs, setRuns] = useState<ExecutionRun[]>(() => {
        try {
            const storedRuns = localStorage.getItem(EXECUTION_LOGS_STORAGE_KEY);
            return storedRuns ? JSON.parse(storedRuns) : [];
        } catch (error) {
            console.error("Error reading execution logs from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(EXECUTION_LOGS_STORAGE_KEY, JSON.stringify(runs));
        } catch (error) {
            console.error("Error saving execution logs to localStorage", error);
        }
    }, [runs]);

    const createRun = useCallback(() => {
        const newRun: ExecutionRun = {
            id: `run_${new Date().getTime()}`,
            startTimestamp: new Date().toISOString(),
            status: 'running',
            events: [],
        };
        setRuns(prev => [newRun, ...prev]);
        return newRun.id;
    }, []);

    const addEventToRun = useCallback((runId: string, event: Omit<ExecutionEvent, 'timestamp'>) => {
        setRuns(prev => prev.map(run => {
            if (run.id === runId) {
                const newEvent: ExecutionEvent = {
                    ...event,
                    timestamp: new Date().toISOString()
                };
                return { ...run, events: [...run.events, newEvent] };
            }
            return run;
        }));
    }, []);

    const endRun = useCallback((runId: string, status: 'completed' | 'failed') => {
        setRuns(prev => prev.map(run => {
            if (run.id === runId) {
                return { ...run, status, endTimestamp: new Date().toISOString() };
            }
            return run;
        }));
    }, []);
    
    const clearLogs = useCallback(() => {
        if (window.confirm('Czy na pewno chcesz usunąć wszystkie logi wykonania?')) {
            setRuns([]);
        }
    }, []);

    return { runs, createRun, addEventToRun, endRun, clearLogs };
};