import { FC, useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { useAgents, AgentConfig } from '../hooks/useAgents';
import { useCustomeItems, CustomItem } from '../hooks/useCustomItems';
import { useSchema, SchemaState, SchemaItem } from '../hooks/useSchema';
import { toolsList, nodesList } from './NarzedziaIWezly';
import { SparklesIcon, ToolsIcon, MyAgentsIcon, SchemaIcon } from '../icons';

interface GeneratorAIProps {
  onNavigate: (page: string) => void;
}

// Simplified versions for context
const availableTools = toolsList.map(t => ({ id: t.id, name: t.name, description: t.description }));
const availableNodes = nodesList.map(n => ({ id: n.id, name: n.name, description: n.description }));

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface NewAgent {
    name: string;
    instruction: string;
    icon: string;
    tools: string[];
}

interface AnalysisResult {
    summary: string;
    newAgents: NewAgent[];
    newTools: Omit<CustomItem, 'id' | 'isCustom'>[];
    newNodes: Omit<CustomItem, 'id' | 'isCustom'>[];
    schema: {
        items: { baseId: string; label: string, data?: Record<string, any> }[];
        connections: { from: number; to: number; }[]; // Use indices for simplicity
    }
}

const getApiKey = (): string | null => {
    try {
        const storedKeys = localStorage.getItem('api-keys');
        if (storedKeys) return JSON.parse(storedKeys).gemini || null;
    } catch (e) { console.error(e); }
    return null;
};

const GeneratorAI: FC<GeneratorAIProps> = ({ onNavigate }) => {
    const { addAgent } = useAgents();
    const { addCustomItem } = useCustomeItems();
    const { loadSchema } = useSchema();

    const [prompt, setPrompt] = useState('');
    const [loadingState, setLoadingState] = useState<LoadingState>('idle');
    const [loadingMessage, setLoadingMessage] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const loadingMessages = [
        "Analizuję Twoje zadanie...",
        "Dekomponuję problem na mniejsze kroki...",
        "Wybieram odpowiednie narzędzia i węzły...",
        "Projektuję architekturę schematu...",
        "Sprawdzam, czy potrzebne są nowe komponenty...",
        "Finalizuję generowanie planu..."
    ];

    useEffect(() => {
        let interval: number;
        if (loadingState === 'loading') {
            let i = 0;
            setLoadingMessage(loadingMessages[i]);
            interval = window.setInterval(() => {
                i = (i + 1) % loadingMessages.length;
                setLoadingMessage(loadingMessages[i]);
            }, 2500);
        }
        return () => window.clearInterval(interval);
    }, [loadingState]);

    const handleGenerate = async () => {
        const apiKey = getApiKey();
        if (!apiKey) {
            setError("Klucz API Google Gemini nie jest skonfigurowany. Przejdź do Ustawień, aby go dodać.");
            setLoadingState('error');
            return;
        }

        setLoadingState('loading');
        setError(null);
        setAnalysisResult(null);

        const ai = new GoogleGenAI({ apiKey });
        
        try {
            const systemInstruction = `Jesteś ekspertem w projektowaniu zautomatyzowanych przepływów pracy. Twoim zadaniem jest przetłumaczenie zadania użytkownika na kompletny schemat, który można wykonać.
1.  Przeanalizuj zadanie i podziel je na logiczne kroki.
2.  Dla każdego kroku, dobierz odpowiedni komponent z listy dostępnych narzędzi lub węzłów. Zawsze preferuj używanie istniejących komponentów.
3.  Jeśli dla jakiegoś kroku absolutnie nie ma odpowiedniego komponentu, zdefiniuj nowy (narzędzie lub węzeł).
4.  Jeśli w procesie potrzebna jest analiza lub decyzja oparta na AI, zdefiniuj nowego Agenta.
5.  Zaprojektuj schemat, łącząc wszystkie komponenty w logiczną całość. Pamiętaj o węzłach 'start' i 'end'.
6.  Zwróć odpowiedź WYŁĄCZNIE w formacie JSON, zgodnym z podanym schematem. Nie dodawaj żadnych wyjaśnień ani formatowania markdown.`;

            const fullPrompt = `
Dostępne narzędzia: ${JSON.stringify(availableTools)}
Dostępne węzły: ${JSON.stringify(availableNodes)}

Zadanie użytkownika: "${prompt}"

Wygeneruj schemat dla tego zadania.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                },
            });
            
            const resultText = response.text.trim();
            const resultJson = JSON.parse(resultText);

            setAnalysisResult(resultJson as AnalysisResult);
            setLoadingState('success');

        } catch (e) {
            console.error(e);
            setError(`Wystąpił błąd podczas generowania schematu: ${(e as Error).message}. Spróbuj przeformułować swoje zapytanie.`);
            setLoadingState('error');
        }
    };
    
    const handleConfirmAndOpen = () => {
        if (!analysisResult) return;

        const newAgentIds: Record<number, string> = {};
        const newToolIds: Record<number, string> = {};
        const newNodeIds: Record<number, string> = {};

        // 1. Create new components and store their new IDs
        analysisResult.newAgents.forEach((agent, index) => {
            const newAgent = { ...agent, temperature: 0.7, topP: 1, topK: 40, maxTokens: 2048 };
            const addedAgent = addAgent(newAgent, true); // Assuming addAgent can return the new agent with ID
            if(addedAgent) newAgentIds[index] = addedAgent.id;
        });
        analysisResult.newTools.forEach((tool, index) => {
            const addedTool = addCustomItem(tool, true);
            if(addedTool) newToolIds[index] = addedTool.id;
        });
        analysisResult.newNodes.forEach((node, index) => {
            const addedNode = addCustomItem(node, true);
            if(addedNode) newNodeIds[index] = addedNode.id;
        });

        // 2. Build the schema using the new IDs
        const newSchema: SchemaState = { items: [], connections: [] };
        const tempIdMap: Record<string, string> = {};
        const allAvailableItems = [...toolsList, ...nodesList];

        analysisResult.schema.items.forEach((item, index) => {
            let baseItem: any;
            let finalId: string;

            if (item.baseId.startsWith("new_agent_")) {
                const agentIndex = parseInt(item.baseId.split("_")[2]);
                finalId = newAgentIds[agentIndex];
                baseItem = { id: finalId, ...analysisResult.newAgents[agentIndex], type: 'agent' };
            } else if (item.baseId.startsWith("new_tool_")) {
                const toolIndex = parseInt(item.baseId.split("_")[2]);
                finalId = newToolIds[toolIndex];
                baseItem = { id: finalId, ...analysisResult.newTools[toolIndex] };
            } else if (item.baseId.startsWith("new_node_")) {
                const nodeIndex = parseInt(item.baseId.split("_")[2]);
                finalId = newNodeIds[nodeIndex];
                baseItem = { id: finalId, ...analysisResult.newNodes[nodeIndex] };
            } else {
                baseItem = allAvailableItems.find(i => i.id === item.baseId);
                finalId = `${baseItem.id}_${new Date().getTime()}_${index}`;
            }

            if (!baseItem) {
                console.error(`Could not find base item for: ${item.baseId}`);
                return;
            }

            const schemaItem: SchemaItem = {
                id: finalId,
                baseId: baseItem.id,
                type: baseItem.type,
                name: item.label,
                iconName: baseItem.iconName || baseItem.icon,
                position: { x: (index % 4) * 250 + 50, y: Math.floor(index / 4) * 120 + 50 },
                data: item.data || {}
            };
            newSchema.items.push(schemaItem);
            tempIdMap[index] = schemaItem.id;
        });

        analysisResult.schema.connections.forEach(conn => {
            const fromId = tempIdMap[conn.from];
            const toId = tempIdMap[conn.to];
            if (fromId && toId) {
                newSchema.connections.push({ id: `conn_${fromId}_${toId}`, from: fromId, to: toId });
            }
        });
        
        loadSchema(newSchema, true);
        onNavigate('Interaktywny schemat');
    };

    return (
        <main className="main-content">
            <section className="config-page">
                <h2 id="page-title">Generator Schematów AI</h2>
                <p>Opisz zadanie lub proces w języku naturalnym, a AI automatycznie zaprojektuje i zbuduje dla Ciebie gotowy do użycia schemat.</p>

                <div className="config-group">
                    <label htmlFor="ai-prompt">Opis zadania</label>
                    <textarea 
                        id="ai-prompt" 
                        className="styled-textarea" 
                        rows={5} 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Opisz, co chcesz zautomatyzować. Na przykład: 'Sprawdź najnowsze wiadomości o AI, streść je i wyślij podsumowanie na Slacka.'"
                    />
                    <div className="actions-wrapper" style={{ marginTop: '1rem' }}>
                        <button className="btn btn-save" onClick={handleGenerate} disabled={loadingState === 'loading' || !prompt.trim()}>
                            <SparklesIcon/> {loadingState === 'loading' ? 'Generowanie...' : 'Generuj Schemat'}
                        </button>
                    </div>
                </div>

                {loadingState === 'loading' && (
                    <div className="config-group" style={{ textAlign: 'center', padding: '2rem' }}>
                         <p className="status-message testing" style={{ animation: 'pulse 1.5s infinite' }}>{loadingMessage}</p>
                    </div>
                )}
                
                {error && (
                    <div className="config-group" style={{ borderLeft: '4px solid var(--error-color)'}}>
                        <h4>Wystąpił błąd</h4>
                        <p className="status-message error">{error}</p>
                    </div>
                )}

                {analysisResult && loadingState === 'success' && (
                    <div className="config-group" style={{ borderLeft: '4px solid var(--success-color)'}}>
                        <h3><SparklesIcon/> Plan Wygenerowany!</h3>
                        <p style={{marginTop: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                            <strong>Podsumowanie AI:</strong> {analysisResult.summary}
                        </p>
                        
                        {analysisResult.newAgents.length > 0 && (
                            <div>
                                <h4><MyAgentsIcon/> Nowe agenty do utworzenia:</h4>
                                <ul>{analysisResult.newAgents.map(a => <li key={a.name}><strong>{a.name}:</strong> {a.instruction}</li>)}</ul>
                            </div>
                        )}
                        {analysisResult.newTools.length > 0 && (
                             <div>
                                <h4><ToolsIcon/> Nowe narzędzia do utworzenia:</h4>
                                <ul>{analysisResult.newTools.map(t => <li key={t.name}><strong>{t.name}:</strong> {t.description}</li>)}</ul>
                            </div>
                        )}
                         {analysisResult.newNodes.length > 0 && (
                             <div>
                                <h4><SchemaIcon/> Nowe węzły do utworzenia:</h4>
                                <ul>{analysisResult.newNodes.map(n => <li key={n.name}><strong>{n.name}:</strong> {n.description}</li>)}</ul>
                            </div>
                        )}

                        <h4>Proponowany przepływ:</h4>
                        <pre style={{backgroundColor: 'var(--primary-bg)', padding: '1rem', borderRadius: '4px'}}>
                            {analysisResult.schema.items.map((item, index) => {
                                const next = analysisResult.schema.connections.find(c => c.from === index);
                                return `${item.label}${next ? '  ->\n' : ''}`;
                            }).join('')}
                        </pre>

                         <div className="actions-wrapper" style={{ marginTop: '1.5rem' }}>
                            <button className="btn btn-save" onClick={handleConfirmAndOpen}>Zatwierdź i Otwórz</button>
                            <button className="btn btn-reset" onClick={() => setAnalysisResult(null)}>Odrzuć</button>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
};

export default GeneratorAI;
