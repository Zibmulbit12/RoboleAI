import { FC, useState, useRef, MouseEvent, WheelEvent, TouchEvent, useMemo, FC as ReactFC, useEffect } from 'react';
import { GoogleGenAI, FunctionDeclaration, Part, Content } from '@google/genai';
import { useSchema, SchemaItem } from '../hooks/useSchema';
import { useExecution } from '../hooks/useExecution';
import { useAgents } from '../hooks/useAgents';
import { useProjects } from '../hooks/useProjects';
import { tools } from '../tools';
import { agentIcons } from './StworzAgenta';
import * as Icons from '../icons';
import { RunIcon, ResetIcon, CenterIcon, ClearIcon, SaveIcon } from '../icons';

interface ViewState {
    x: number;
    y: number;
    zoom: number;
}

type NodeStatus = 'idle' | 'running' | 'success' | 'error';
type ConnectionStatus = 'idle' | 'success' | 'error';
type DrawingLine = {
    startItemId: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    method: 'point' | 'long-press';
};

const getApiKey = (): string => {
    try {
        const storedKeys = localStorage.getItem('api-keys');
        if (storedKeys) {
            const parsedKeys = JSON.parse(storedKeys);
            if (parsedKeys.gemini) return parsedKeys.gemini;
        }
    } catch (e) { console.error(e); }
    throw new Error("Klucz API Google Gemini nie jest skonfigurowany. Przejdź do Ustawień, aby go dodać.");
};

const iconComponentMap = new Map<string, ReactFC>();
const getIconComponent = (item: SchemaItem) => {
    const cacheKey = `${item.type}-${item.iconName}`;
    if (iconComponentMap.has(cacheKey)) {
        return iconComponentMap.get(cacheKey)!;
    }
    let component: ReactFC;
    if (item.type === 'agent') {
        const icon = agentIcons.find(i => i.name === item.iconName);
        component = icon ? icon.component : Icons.RobotIcon;
    } else {
        // Fix: Use the exported iconMap for a direct and safer lookup
        // instead of constructing the component name string.
        component = Icons.iconMap[item.iconName] || Icons.ToolsIcon;
    }
    iconComponentMap.set(cacheKey, component);
    return component;
};

const getNodeDataPreview = (item: SchemaItem): string | null => {
    if (!item.data || Object.keys(item.data).length === 0) return null;
    
    switch (item.baseId) {
        case 'get_input':
        case 'log_message':
        case 'throw_error':
            return `"${String(item.data.value || item.data.message || '').substring(0, 20)}..."`;
        case 'wait':
            return `${item.data.duration}s`;
        case 'set_variable':
            return `${item.data.name} = "${String(item.data.value || '').substring(0, 15)}..."`;
        default:
            return null;
    }
}

interface InteraktywnySchematProps {
  onNavigate: (page: string) => void;
}

const InteraktywnySchemat: FC<InteraktywnySchematProps> = ({ onNavigate }) => {
    const { schema, updateItemPosition, clearSchema, addConnection, removeItemFromSchema, loadSchema } = useSchema();
    const { addProject, getProject } = useProjects();
    const { agents } = useAgents();
    const { createRun, addEventToRun, endRun } = useExecution();
    
    const [viewState, setViewState] = useState<ViewState>({ x: 200, y: 150, zoom: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [draggingItem, setDraggingItem] = useState<string | null>(null);
    const [drawingLine, setDrawingLine] = useState<DrawingLine | null>(null);
    
    const [mouseDownNode, setMouseDownNode] = useState<string | null>(null);
    const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
    const connectTimeoutRef = useRef<number | null>(null);
    const dragStartPos = useRef<{ x: number, y: number } | null>(null);

    const lastPanPosition = useRef({ x: 0, y: 0 });
    const lastTouchDistance = useRef<number | null>(null);
    
    const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({});
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, ConnectionStatus>>({});
    const [executionState, setExecutionState] = useState<'idle' | 'running' | 'error'>('idle');
    const containerRef = useRef<HTMLDivElement>(null);
    const nodeRefMap = useRef<Record<string, HTMLDivElement | null>>({});

    // Effect to handle running a project from URL
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            const params = new URLSearchParams(hash.substring(hash.indexOf('?')));
            const projectIdToRun = params.get('runProject');

            if (projectIdToRun) {
                const project = getProject(projectIdToRun);
                if (project) {
                    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#Interaktywny schemat`);
                    if (loadSchema(project.schema, true)) { // force load
                        setTimeout(() => handleExecution(false), 200); // false = not demo
                    }
                }
            }
        };

        handleHashChange(); // Run on initial load
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [getProject, loadSchema]);


    const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const rect = containerRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleAmount = 1 - e.deltaY * 0.001;
        const newZoom = Math.max(0.2, Math.min(3, viewState.zoom * scaleAmount));
        
        const newX = mouseX - (mouseX - viewState.x) * (newZoom / viewState.zoom);
        const newY = mouseY - (mouseY - viewState.y) * (newZoom / viewState.zoom);

        setViewState({ x: newX, y: newY, zoom: newZoom });
    };

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget || e.target === nodeRefMap.current['canvas']) {
            setIsPanning(true);
            lastPanPosition.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        const dx = e.clientX - lastPanPosition.current.x;
        const dy = e.clientY - lastPanPosition.current.y;
        
        if (mouseDownNode && !drawingLine) {
            const moveDist = Math.hypot(e.clientX - dragStartPos.current!.x, e.clientY - dragStartPos.current!.y);
            if (moveDist > 5) {
                if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
                setDraggingItem(mouseDownNode);
                setMouseDownNode(null);
            }
        }
    
        if (isPanning) {
            setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        } else if (draggingItem) {
            updateItemPosition(draggingItem, dx / viewState.zoom, dy / viewState.zoom);
        } else if (drawingLine) {
            const rect = containerRef.current!.getBoundingClientRect();
            setDrawingLine(prev => prev && { ...prev, endX: (e.clientX - rect.left - viewState.x) / viewState.zoom, endY: (e.clientY - rect.top - viewState.y) / viewState.zoom });
        }
        lastPanPosition.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseUp = () => {
        if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
        if (drawingLine && hoveredTarget && drawingLine.startItemId !== hoveredTarget) {
            addConnection(drawingLine.startItemId, hoveredTarget);
        }
        setIsPanning(false);
        setDraggingItem(null);
        setDrawingLine(null);
        setMouseDownNode(null);
        setHoveredTarget(null);
    };

    const handleNodeMouseDown = (e: MouseEvent, itemId: string) => {
        e.stopPropagation();
        setMouseDownNode(itemId);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        lastPanPosition.current = { x: e.clientX, y: e.clientY };
    
        connectTimeoutRef.current = window.setTimeout(() => {
            if (!containerRef.current || !nodeRefMap.current[itemId]) return;
            
            const item = schema.items.find(i => i.id === itemId)!;
            const nodeRef = nodeRefMap.current[itemId]!;
            const containerRect = containerRef.current.getBoundingClientRect();
    
            const startX = item.position.x + nodeRef.offsetWidth / 2;
            const startY = item.position.y + nodeRef.offsetHeight / 2;
            const endX = (e.clientX - containerRect.left - viewState.x) / viewState.zoom;
            const endY = (e.clientY - containerRect.top - viewState.y) / viewState.zoom;
    
            setDrawingLine({ startItemId: itemId, startX, startY, endX, endY, method: 'long-press' });
            setMouseDownNode(null);
        }, 500);
    };
    
    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (e.touches.length === 1 && (e.target === e.currentTarget || e.target === nodeRefMap.current['canvas'])) {
             setIsPanning(true);
             lastPanPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
             setIsPanning(false);
             setDraggingItem(null);
             lastTouchDistance.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        }
    };
    
    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const dx = touch.clientX - lastPanPosition.current.x;
            const dy = touch.clientY - lastPanPosition.current.y;

            if (mouseDownNode && !drawingLine) {
                const moveDist = Math.hypot(touch.clientX - dragStartPos.current!.x, touch.clientY - dragStartPos.current!.y);
                if (moveDist > 5) {
                    if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
                    setDraggingItem(mouseDownNode);
                    setMouseDownNode(null);
                }
            }
    
            if (isPanning) {
                setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            } else if (draggingItem) {
                updateItemPosition(draggingItem, dx / viewState.zoom, dy / viewState.zoom);
            } else if (drawingLine) {
                const rect = containerRef.current!.getBoundingClientRect();
                setDrawingLine(prev => prev && { ...prev, endX: (touch.clientX - rect.left - viewState.x) / viewState.zoom, endY: (touch.clientY - rect.top - viewState.y) / viewState.zoom });
                
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                const nodeElement = targetElement?.closest('.schema-node');
                if (nodeElement) {
                     const targetId = nodeElement.getAttribute('data-id');
                    if (targetId && targetId !== drawingLine.startItemId) {
                        setHoveredTarget(targetId);
                    } else if (hoveredTarget) {
                        setHoveredTarget(null);
                    }
                } else {
                     setHoveredTarget(null);
                }
            }
            lastPanPosition.current = { x: touch.clientX, y: touch.clientY };

        } else if (e.touches.length === 2 && lastTouchDistance.current) {
             const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
             const scaleAmount = newDist / lastTouchDistance.current;
             
             const rect = containerRef.current!.getBoundingClientRect();
             const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
             const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
             
             const newZoom = Math.max(0.2, Math.min(3, viewState.zoom * scaleAmount));
             const newX = midX - (midX - viewState.x) * (newZoom / viewState.zoom);
             const newY = midY - (midY - viewState.y) * (newZoom / viewState.zoom);
             
             lastTouchDistance.current = newDist;
             setViewState({ x: newX, y: newY, zoom: newZoom });
        }
    };
    
    const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
        if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
        if (e.touches.length < 2) lastTouchDistance.current = null;
        if (e.touches.length < 1) {
            if (drawingLine && hoveredTarget && drawingLine.startItemId !== hoveredTarget) {
                addConnection(drawingLine.startItemId, hoveredTarget);
            }
            setIsPanning(false);
            setDraggingItem(null);
            setDrawingLine(null);
            setMouseDownNode(null);
            setHoveredTarget(null);
        }
    };

    const onItemTouchStart = (e: TouchEvent, itemId: string) => {
        if(e.touches.length === 1) {
            e.stopPropagation();
            const touch = e.touches[0];
            setMouseDownNode(itemId);
            dragStartPos.current = { x: touch.clientX, y: touch.clientY };
            lastPanPosition.current = { x: touch.clientX, y: touch.clientY };
    
            connectTimeoutRef.current = window.setTimeout(() => {
                if (!containerRef.current || !nodeRefMap.current[itemId]) return;
    
                const item = schema.items.find(i => i.id === itemId)!;
                const nodeRef = nodeRefMap.current[itemId]!;
                const containerRect = containerRef.current.getBoundingClientRect();
                
                const startX = item.position.x + nodeRef.offsetWidth / 2;
                const startY = item.position.y + nodeRef.offsetHeight / 2;
                const endX = (touch.clientX - containerRect.left - viewState.x) / viewState.zoom;
                const endY = (touch.clientY - containerRect.top - viewState.y) / viewState.zoom;
    
                setDrawingLine({ startItemId: itemId, startX, startY, endX, endY, method: 'long-press' });
                setMouseDownNode(null);
            }, 500);
        }
    };

    const onPointMouseDown = (e: MouseEvent, itemId: string) => {
        e.stopPropagation();
        const item = schema.items.find(i => i.id === itemId)!;
        const nodeWidth = nodeRefMap.current[itemId]?.offsetWidth || 170;
        const nodeHeight = nodeRefMap.current[itemId]?.offsetHeight || 40;
        const startX = item.position.x + nodeWidth;
        const startY = item.position.y + nodeHeight / 2;
        setDrawingLine({ startItemId: itemId, startX, startY, endX: startX, endY: startY, method: 'point' });
    };

    const onPointMouseUp = (e: MouseEvent, itemId: string) => {
        e.stopPropagation();
        if (drawingLine && drawingLine.startItemId !== itemId) {
            addConnection(drawingLine.startItemId, itemId);
        }
        setDrawingLine(null);
    };

    const handleSaveProject = () => {
        if (schema.items.length === 0) {
            alert("Schemat jest pusty. Dodaj elementy, aby zapisać projekt.");
            return;
        }
        const projectName = prompt("Wprowadź nazwę dla swojego projektu:");
        if (projectName && projectName.trim() !== '') {
            addProject(projectName.trim(), schema);
            alert(`Projekt "${projectName.trim()}" został zapisany!`);
            onNavigate('Gotowe projekty');
        }
    };

    const handleExecution = async (isDemoMode: boolean) => {
        if (executionState === 'running') return;

        setExecutionState('running');
        handleReset(); // Clear previous statuses
        const runId = isDemoMode ? null : createRun();

        const { items, connections } = schema;
        if (items.length === 0) {
            if (runId) endRun(runId, 'completed');
            setExecutionState('idle');
            return;
        }
        
        const addLog = (nodeId: string, status: 'success' | 'error' | 'started', message: string, data?: any) => {
            if (isDemoMode || !runId) return;
            const node = items.find(i => i.id === nodeId);
            if (node) {
                addEventToRun(runId, { nodeId, nodeName: node.name, status, message, data });
            }
        };

        const adjacencyMap = new Map<string, string[]>();
        const inDegree = new Map<string, number>();
        items.forEach(item => {
            adjacencyMap.set(item.id, []);
            inDegree.set(item.id, 0);
        });
        connections.forEach(conn => {
            adjacencyMap.get(conn.from)?.push(conn.to);
            inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
        });

        const startNodes = items.filter(item => (inDegree.get(item.id) || 0) === 0);
        
        const inputNode = startNodes.find(n => n.baseId === 'get_input' && n.data?.value);
        let executionContext: any = inputNode ? inputNode.data!.value : "Początkowe dane wejściowe dla schematu.";

        const executedNodes = new Set<string>();
        let hasError = false;

        const executeNode = async (itemId: string): Promise<void> => {
            if (executedNodes.has(itemId) || hasError) return;
            executedNodes.add(itemId);

            const item = items.find(i => i.id === itemId)!;
            setNodeStatuses(prev => ({ ...prev, [itemId]: 'running' }));
            addLog(itemId, 'started', `Odebrano dane wejściowe.`, executionContext);
            await new Promise(r => setTimeout(r, 500)); // Animation delay
            
            try {
                let result: any = executionContext;
                if (!isDemoMode) {
                    if (item.type === 'agent') {
                        const agentConfig = agents.find(a => a.id === item.id);
                        if (!agentConfig) throw new Error(`Nie znaleziono konfiguracji agenta ${item.name}`);
                        const ai = new GoogleGenAI({ apiKey: getApiKey() });
                        const selectedToolSchemas: FunctionDeclaration[] = agentConfig.tools.map(toolKey => tools[toolKey]?.functionDeclaration).filter(Boolean);
                        let history: Content[] = [{ role: 'user', parts: [{ text: executionContext }] }];
                        for (let i = 0; i < 5; i++) {
                            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: history, config: { systemInstruction: agentConfig.instruction, temperature: agentConfig.temperature, topP: agentConfig.topP, topK: agentConfig.topK, tools: selectedToolSchemas.length > 0 ? [{functionDeclarations: selectedToolSchemas}] : undefined } });
                            const responseContent = response.candidates[0].content;
                            const functionCalls = responseContent.parts.filter(part => part.functionCall);
                            if (functionCalls.length > 0 && functionCalls[0].functionCall) {
                                history.push(responseContent);
                                const call = functionCalls[0].functionCall;
                                const toolToCall = Object.values(tools).find(t => t.functionDeclaration.name === call.name);
                                if (toolToCall) {
                                    addLog(itemId, 'success', `Agent wywołuje narzędzie: ${toolToCall.displayName}`, call.args);
                                    const toolResult = await toolToCall.execute(call.args);
                                    addLog(itemId, 'success', `Narzędzie '${toolToCall.displayName}' zwróciło wynik.`, toolResult);
                                    history.push({ role: 'tool', parts: [{ functionResponse: { name: call.name, response: { result: toolResult } } }] });
                                } else { throw new Error(`Agent próbował wywołać nieznane narzędzie: ${call.name}`); }
                            } else { result = response.text; break; }
                        }
                    } else if (item.type === 'tool') {
                        const tool = tools[item.baseId];
                        if (!tool) throw new Error(`Nie znaleziono implementacji narzędzia ${item.name}`);
                        const argName = Object.keys(tool.functionDeclaration.parameters.properties)[0];
                        result = await tool.execute({ [argName]: executionContext });
                    } else {
                        switch (item.baseId) {
                            case 'wait':
                                const duration = item.data?.duration || 1;
                                addLog(itemId, 'success', `Oczekiwanie przez ${duration}s...`);
                                await new Promise(resolve => window.setTimeout(resolve, duration * 1000));
                                break;
                            case 'log_message':
                                addLog(itemId, 'success', item.data?.message || 'Brak wiadomości');
                                break;
                        }
                    }
                } else {
                     // DEMO LOGIC: Check for unconfigured inputs, etc.
                    if(item.baseId === 'get_input' && !item.data?.value){
                        throw new Error("Węzeł 'Dane wejściowe' nie ma skonfigurowanej wartości.");
                    }
                }
                
                executionContext = result;
                setNodeStatuses(prev => ({ ...prev, [itemId]: 'success' }));
                addLog(itemId, 'success', `Wykonano pomyślnie. Zwrócono wynik.`, result);

                const nextNodes = adjacencyMap.get(itemId) || [];
                for (const conn of connections.filter(c => c.from === itemId)) {
                    setConnectionStatuses(prev => ({ ...prev, [conn.id]: 'success' }));
                }
                await new Promise(r => setTimeout(r, 200)); 
                
                for (const nextNodeId of nextNodes) {
                    await executeNode(nextNodeId);
                }

            } catch (error) {
                hasError = true;
                setNodeStatuses(prev => ({ ...prev, [itemId]: 'error' }));
                for (const conn of connections.filter(c => c.to === itemId)) {
                    setConnectionStatuses(prev => ({ ...prev, [conn.id]: 'error' }));
                }
                addLog(itemId, 'error', `Błąd: ${(error as Error).message}`);
                return;
            }
        };
        
        if (startNodes.length === 0 && items.length > 0) {
             setNodeStatuses(prev => ({ ...prev, [items[0].id]: 'error' }));
             addLog(items[0].id, 'error', 'Błąd: Nie znaleziono węzła startowego. Sprawdź czy nie ma cykli w schemacie.');
             hasError = true;
        } else {
            await Promise.all(startNodes.map(node => executeNode(node.id)));
        }

        if (runId) endRun(runId, hasError ? 'failed' : 'completed');
        setExecutionState(hasError ? 'error' : 'idle');
    };

    const handleReset = () => {
        setNodeStatuses({});
        setConnectionStatuses({});
        setExecutionState('idle');
    }
    const handleCenter = () => setViewState({x: 200, y: 150, zoom: 1});

    const connectionPaths = useMemo(() => {
        return schema.connections.map(conn => {
            const fromItem = schema.items.find(i => i.id === conn.from);
            const toItem = schema.items.find(i => i.id === conn.to);
            if (!fromItem || !toItem) return null;
            const fromNode = nodeRefMap.current[fromItem.id];
            const toNode = nodeRefMap.current[toItem.id];
            const fromWidth = fromNode?.offsetWidth || 170;
            const fromHeight = fromNode?.offsetHeight || 40;
            const toHeight = toNode?.offsetHeight || 40;
            const sx = fromItem.position.x + fromWidth;
            const sy = fromItem.position.y + fromHeight / 2;
            const ex = toItem.position.x;
            const ey = toItem.position.y + toHeight / 2;
            const c1x = sx + Math.abs(ex - sx) * 0.5;
            const c2x = ex - Math.abs(ex - sx) * 0.5;
            return { id: conn.id, d: `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ey}, ${ex} ${ey}` };
        }).filter(Boolean);
    }, [schema.connections, schema.items, nodeStatuses]); // Re-render on status change for size updates

    const drawingLinePath = useMemo(() => {
        if (!drawingLine) return '';
        const { startX, startY, endX, endY } = drawingLine;
        const c1x = startX + Math.abs(endX - startX) * 0.5;
        const c2x = endX - Math.abs(endX - startX) * 0.5;
        return `M ${startX} ${startY} C ${c1x} ${startY}, ${c2x} ${endY}, ${endX} ${endY}`;
    }, [drawingLine]);

    return (
        <div 
            className="schema-container"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
             <div className="schema-toolbar">
                <button onClick={() => handleExecution(false)} className={`run-btn ${executionState}`} aria-label="Uruchom schemat" disabled={executionState === 'running'}>
                    <RunIcon /> {executionState === 'running' ? 'Uruchamianie...' : 'Uruchom schemat'}
                </button>
                <button onClick={handleReset} aria-label="Resetuj stany węzłów"><ResetIcon /></button>
                <button onClick={handleCenter} aria-label="Wyśrodkuj widok"><CenterIcon /></button>
                <button onClick={handleSaveProject} aria-label="Zapisz projekt" disabled={executionState === 'running'}><SaveIcon /> Zapisz projekt</button>
                <button onClick={clearSchema} aria-label="Wyczyść schemat" disabled={executionState === 'running'}><ClearIcon /></button>
            </div>

            <svg className="schema-svg-layer" style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})` }}>
                <g>
                    {connectionPaths.map(path => path && <path key={path.id} d={path.d} className={`connection-line ${connectionStatuses[path.id] || 'idle'}`} />)}
                    {drawingLine && <path d={drawingLinePath} className={`connection-line-drawing ${drawingLine.method === 'long-press' ? 'red-line' : ''}`} />}
                </g>
            </svg>

            <div ref={(el) => { nodeRefMap.current['canvas'] = el; }} className="schema-canvas" style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})` }}>
                {schema.items.map(item => {
                    const IconComponent = getIconComponent(item);
                    const isConnectionSource = drawingLine?.startItemId === item.id;
                    const isConnectionTarget = hoveredTarget === item.id && drawingLine?.startItemId !== item.id;
                    const statusClass = nodeStatuses[item.id] || 'idle';
                    const nodeClass = `schema-node ${item.type} ${statusClass} ${isConnectionSource ? 'connection-source' : ''} ${isConnectionTarget ? 'connection-target' : ''}`;
                    const dataPreview = getNodeDataPreview(item);

                    return (
                        <div
                            key={item.id}
                            ref={(el) => { nodeRefMap.current[item.id] = el; }}
                            className={nodeClass}
                            style={{ transform: `translate(${item.position.x}px, ${item.position.y}px)` }}
                            onMouseDown={(e) => handleNodeMouseDown(e, item.id)}
                            onTouchStart={(e) => onItemTouchStart(e, item.id)}
                            onMouseEnter={() => { if (drawingLine && drawingLine.startItemId !== item.id) setHoveredTarget(item.id); }}
                            onMouseLeave={() => { if (hoveredTarget === item.id) setHoveredTarget(null); }}
                            data-id={item.id}
                        >
                            <div className={`connection-point input`} onMouseUp={(e) => onPointMouseUp(e, item.id)} />
                            <div className={`schema-node-icon ${item.type}`}>
                                <IconComponent />
                            </div>
                            <div className="schema-node-content">
                                <span className="schema-node-title">{item.name}</span>
                                {dataPreview && <span className="schema-node-data-preview">{dataPreview}</span>}
                            </div>
                            <div className={`connection-point output`} onMouseDown={(e) => onPointMouseDown(e, item.id)} />
                            <button className="schema-node-delete" onClick={() => removeItemFromSchema(item.id)} aria-label={`Usuń ${item.name}`}>&times;</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InteraktywnySchemat;