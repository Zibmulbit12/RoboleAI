import { FC, useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
// Fix: Import Content type to correctly handle chat history with roles.
import { GoogleGenAI, FunctionDeclaration, Part, Content } from '@google/genai';
import { useAgents, AgentConfig } from '../hooks/useAgents';

import { RobotIcon, BookIcon, LightbulbIcon, CodeIcon } from '../icons';
import { tools } from '../tools';

interface ChatMessage {
    role: 'user' | 'model';
    parts: Part[];
}

interface StworzAgentaProps {
  onNavigate: (page: string) => void;
}

const initialAgentState: Omit<AgentConfig, 'id'> = {
    name: '',
    instruction: '',
    icon: 'robot',
    tools: [],
    temperature: 0.7,
    topP: 1,
    topK: 40,
    maxTokens: 2048,
};

export const agentIcons = [
    { name: 'robot', component: RobotIcon },
    { name: 'book', component: BookIcon },
    { name: 'lightbulb', component: LightbulbIcon },
    { name: 'code', component: CodeIcon },
];

const availableTools = Object.keys(tools);

const API_KEYS_STORAGE_KEY = 'api-keys';

const StworzAgenta: FC<StworzAgentaProps> = ({ onNavigate }) => {
    const { agents, addAgent, updateAgent } = useAgents();
    const [agentConfig, setAgentConfig] = useState(initialAgentState);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    const [toolToTest, setToolToTest] = useState('');
    const [toolArg, setToolArg] = useState('');
    const [toolResult, setToolResult] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const chatHistoryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Parse edit ID from the URL hash, not the search params
        const hash = window.location.hash;
        const paramString = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
        const params = new URLSearchParams(paramString);
        const agentId = params.get('edit');
        if (agentId) {
            const agentToEdit = agents.find(a => a.id === agentId);
            if (agentToEdit) {
                setAgentConfig(agentToEdit);
                setIsEditMode(true);
                setEditId(agentId);
                // Clear agent preview when loading a new agent to edit
                setChatHistory([]);
            }
        } else {
            setAgentConfig(initialAgentState);
            setIsEditMode(false);
            setEditId(null);
        }
    }, [window.location.hash, agents]);
    
    useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [chatHistory]);

    useEffect(() => {
        const selectedTools = agentConfig.tools;
        if (selectedTools.length > 0 && !selectedTools.includes(toolToTest)) {
            setToolToTest(selectedTools[0] || '');
        } else if (selectedTools.length === 0) {
            setToolToTest('');
        }
        setToolArg('');
        setToolResult('');
    }, [agentConfig.tools, toolToTest]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setAgentConfig(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAgentConfig(prev => ({ ...prev, [name]: parseFloat(value) }));
    };
    
    const handleToolToggle = (toolKey: string) => {
        setAgentConfig(prev => {
            const newTools = prev.tools.includes(toolKey)
                ? prev.tools.filter(t => t !== toolKey)
                : [...prev.tools, toolKey];
            return { ...prev, tools: newTools };
        });
    };

    const handleReset = () => {
        setAgentConfig(initialAgentState);
    }

    const handleSubmit = () => {
        if (isEditMode && editId) {
            updateAgent(editId, agentConfig);
            alert(`Agent "${agentConfig.name}" zaktualizowany!`);
        } else {
            addAgent(agentConfig);
            alert(`Agent "${agentConfig.name}" utworzony!`);
        }
        onNavigate('Moi Agenci');
    }
    
    const handleTestTool = async () => {
        if (!toolToTest) return;
        setIsTesting(true);
        setToolResult('');
        try {
            const tool = tools[toolToTest];
            const argName = Object.keys(tool.functionDeclaration.parameters.properties)[0];
            const result = await tool.execute({ [argName]: toolArg });
            setToolResult(result);
        } catch (error) {
            setToolResult(`Błąd: ${(error as Error).message}`);
        }
        setIsTesting(false);
    };

    const getApiKey = (provider: string): string | null => {
        const keys = localStorage.getItem(API_KEYS_STORAGE_KEY);
        if (keys) {
            try {
                const parsedKeys = JSON.parse(keys);
                return parsedKeys[provider] || null;
            } catch (e) {
                return null;
            }
        }
        return null;
    };
    
    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isGenerating) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: chatInput }] };
        setChatHistory(prev => [...prev, userMessage]);
        setChatInput('');
        setIsGenerating(true);

        const apiKey = getApiKey('gemini');

        try {
            if (!apiKey) {
                throw new Error("Klucz API Google Gemini nie jest skonfigurowany. Przejdź do Ustawień, aby go dodać.");
            }
            const ai = new GoogleGenAI({ apiKey: apiKey });
            const selectedToolSchemas: FunctionDeclaration[] = agentConfig.tools.map(toolKey => tools[toolKey].functionDeclaration);
            // FIX: Use Content[] for chat history to preserve roles for multi-turn conversations and tool use.
            const contents: Content[] = [...chatHistory, userMessage].map(msg => ({ role: msg.role, parts: msg.parts }));

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config: {
                    systemInstruction: agentConfig.instruction,
                    temperature: agentConfig.temperature,
                    topP: agentConfig.topP,
                    topK: agentConfig.topK,
                    tools: selectedToolSchemas.length > 0 ? [{functionDeclarations: selectedToolSchemas}] : undefined,
                },
            });

            const response = result;
            const responseContent = response.candidates[0].content;
            const functionCalls = responseContent.parts.filter(part => part.functionCall);
            
            if (functionCalls.length > 0 && functionCalls[0].functionCall) {
                 const call = functionCalls[0].functionCall;
                 const toolToCall = Object.values(tools).find(t => t.functionDeclaration.name === call.name);
                 
                 if (toolToCall) {
                    const toolResult = await toolToCall.execute(call.args);
                    const functionResponsePart: Part = {
                        functionResponse: { name: call.name, response: { result: toolResult }, }
                    };
                    
                    // FIX: Append model's function call and tool's response to the history for the final API call.
                    // The role 'tool' is used for function/tool responses.
                    const newContents: Content[] = [...contents, responseContent, { role: 'tool', parts: [functionResponsePart] }];
                    
                    const finalResult = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: newContents,
                        config: {
                            systemInstruction: agentConfig.instruction,
                            temperature: agentConfig.temperature,
                            topP: agentConfig.topP,
                            topK: agentConfig.topK,
                            tools: [{functionDeclarations: selectedToolSchemas}]
                        },
                    });
                    // FIX: Append the final model response to the chat history for display.
                    setChatHistory(prev => [...prev, { role: 'model', parts: finalResult.candidates[0].content.parts }]);
                 } else {
                    throw new Error(`Agent próbował wywołać nieznane narzędzie: ${call.name}`);
                 }
            } else {
                // FIX: Append the model response to the chat history for display.
                setChatHistory(prev => [...prev, { role: 'model', parts: responseContent.parts }]);
            }
            
        } catch (error) {
            const errorMessage: ChatMessage = { role: 'model', parts: [{ text: `Wystąpił błąd: ${(error as Error).message}` }] };
            setChatHistory(prev => [...prev, errorMessage]);
        }
        setIsGenerating(false);
    };

    return (
        <main className="main-content">
            <section aria-labelledby="page-title" className="config-page">
                <h2 id="page-title">{isEditMode ? 'Edytuj Agenta' : 'Stwórz Agenta'}</h2>
                <p>Skonfiguruj swojego nowego agenta AI, aby dostosować go do swoich potrzeb.</p>
                <div className="config-container">
                    <div className="config-group">
                        <label htmlFor="agent-name">Nazwa Agenta</label>
                        <input id="agent-name" type="text" name="name" className="styled-input" value={agentConfig.name} onChange={handleInputChange} placeholder="Np. Asystent kreatywny"/>
                        <label htmlFor="agent-instruction" style={{ marginTop: '1rem' }}>Instrukcja systemowa</label>
                        <textarea id="agent-instruction" name="instruction" className="styled-textarea" value={agentConfig.instruction} onChange={handleInputChange} placeholder="Zdefiniuj rolę i zadania agenta, np. 'Jesteś pomocnym asystentem, który specjalizuje się w pisaniu poezji.'"/>
                    </div>

                    <div className="config-group">
                        <label>Wybierz ikonę</label>
                        <div className="icon-picker">
                            {agentIcons.map(icon => (
                                <button key={icon.name} className={`icon-btn ${agentConfig.icon === icon.name ? 'active' : ''}`} onClick={() => setAgentConfig(prev => ({ ...prev, icon: icon.name }))} aria-label={`Wybierz ikonę ${icon.name}`}>
                                    <icon.component />
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="config-group">
                        <label>Narzędzia (opcjonalnie)</label>
                        <div className="tool-picker">
                            {availableTools.map(toolKey => (
                                <button key={toolKey} className={`tool-btn ${agentConfig.tools.includes(toolKey) ? 'active' : ''}`} onClick={() => handleToolToggle(toolKey)}>
                                    {tools[toolKey].displayName}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {agentConfig.tools.length > 0 && (
                        <div className="config-group">
                            <label>Testowanie narzędzi</label>
                            <div className="tool-tester">
                                <select className="styled-select" value={toolToTest} onChange={e => setToolToTest(e.target.value)} aria-label="Wybierz narzędzie do testowania">
                                    {agentConfig.tools.map(toolKey => (
                                        <option key={toolKey} value={toolKey}>{tools[toolKey].displayName}</option>
                                    ))}
                                </select>
                                <input type="text" className="styled-input" value={toolArg} onChange={e => setToolArg(e.target.value)} placeholder="Wprowadź argumenty" aria-label="Argumenty dla narzędzia"/>
                                <button onClick={handleTestTool} className="btn btn-test" disabled={isTesting}>
                                    {isTesting ? 'Testowanie...' : 'Testuj'}
                                </button>
                            </div>
                            {toolResult && (
                                <div className="tool-result"><pre>{toolResult}</pre></div>
                            )}
                        </div>
                    )}
                    
                    <div className="config-group advanced-options">
                        <details open={isAdvancedOpen} onToggle={(e) => setIsAdvancedOpen((e.target as HTMLDetailsElement).open)}>
                            <summary>Opcje zaawansowane</summary>
                            <div className="advanced-options-content">
                                <div className="slider-group">
                                    <label htmlFor="temperature" className="slider-label"><span>Temperatura</span><span>{agentConfig.temperature.toFixed(2)}</span></label>
                                    <input type="range" id="temperature" name="temperature" min="0" max="1" step="0.01" value={agentConfig.temperature} onChange={handleSliderChange} />
                                </div>
                                <div className="slider-group">
                                    <label htmlFor="topP" className="slider-label"><span>Top-P</span><span>{agentConfig.topP.toFixed(2)}</span></label>
                                    <input type="range" id="topP" name="topP" min="0" max="1" step="0.01" value={agentConfig.topP} onChange={handleSliderChange} />
                                </div>
                                 <div className="slider-group">
                                    <label htmlFor="topK" className="slider-label"><span>Top-K</span><span>{agentConfig.topK}</span></label>
                                    <input type="range" id="topK" name="topK" min="1" max="100" step="1" value={agentConfig.topK} onChange={handleSliderChange} />
                                </div>
                                <div>
                                    <label htmlFor="maxTokens">Maksymalna liczba tokenów</label>
                                    <input type="number" id="maxTokens" name="maxTokens" className="styled-input" value={agentConfig.maxTokens} onChange={handleInputChange} />
                                </div>
                            </div>
                        </details>
                    </div>
                    
                    <div className="config-group agent-preview-container">
                        <label>Podgląd Agenta</label>
                        <div className="chat-window">
                            <div className="chat-history" ref={chatHistoryRef}>
                                {chatHistory.map((msg, index) => (
                                    <div key={index} className={`message-bubble ${msg.role === 'user' ? 'user' : 'agent'}`}>
                                        {msg.parts.map(part => part.text).join('')}
                                    </div>
                                ))}
                                {isGenerating && (
                                    <div className="message-bubble agent loading">...</div>
                                )}
                            </div>
                            <form className="chat-input-form" onSubmit={handleSendMessage}>
                                <input type="text" className="styled-input" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Napisz wiadomość do agenta..." aria-label="Wiadomość do agenta" disabled={isGenerating}/>
                                <button type="submit" className="btn btn-save" disabled={isGenerating}>Wyślij</button>
                            </form>
                        </div>
                    </div>

                    <div className="actions-wrapper" style={{ marginTop: '1rem' }}>
                        <button onClick={handleSubmit} className="btn btn-save">{isEditMode ? 'Zaktualizuj Agenta' : 'Stwórz Agenta'}</button>
                        {!isEditMode && <button onClick={handleReset} className="btn btn-reset" style={{ marginLeft: 'auto' }}>Resetuj</button>}
                    </div>
                </div>
            </section>
        </main>
    );
};

export default StworzAgenta;