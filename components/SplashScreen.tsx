import { FC, useState, useEffect, useMemo } from 'react';

interface SplashScreenProps {
    onLoadingComplete: () => void;
}

interface Node {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    isCentral: boolean;
    text?: string;
}

interface Edge {
    id: string;
    from: number;
    to: number;
}

const NUM_NODES = 35;
const NUM_NEIGHBORS = 2; // Each node connects to its N nearest neighbors
const ANIMATION_INTERVAL = 50; // ms between each step
const TOTAL_ANIMATION_DURATION = 12000; // Total time for the splash screen
const FOOTER_AREA_HEIGHT = 80; // px from the bottom to keep clear

const techWords = [
    'API', 'Quantum', 'Cloud', 'SDK', 'JSON', 'VectorDB', 'LLM', 'GPU', 
    'Cortex', 'Neural', 'Matrix', 'React', 'Node.js', 'Python', 'Go', 
    'Rust', 'WebAssembly', 'Docker', 'K8s', 'Serverless', 'Edge', 'IoT', 
    'Blockchain', 'DeFi', 'NFT', 'VR', 'AR', 'MLOps', 'CI/CD', 'Git', 
    'Agile', 'Scrum'
];

export const SplashScreen: FC<SplashScreenProps> = ({ onLoadingComplete }) => {
    const [isHidden, setIsHidden] = useState(false);
    const [activatedItems, setActivatedItems] = useState<Set<string>>(new Set());

    const { nodes, edges } = useMemo(() => {
        const generatedNodes: Node[] = [];
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Create central node
        generatedNodes.push({
            id: 0,
            x: vw / 2,
            y: vh / 2,
            width: 250,
            height: 100,
            isCentral: true,
        });

        // Create other nodes, avoiding the footer area
        for (let i = 1; i < NUM_NODES; i++) {
            generatedNodes.push({
                id: i,
                x: Math.random() * vw,
                y: Math.random() * (vh - FOOTER_AREA_HEIGHT), // Ensure nodes don't overlap footer
                width: Math.random() * 80 + 50,
                height: Math.random() * 25 + 25,
                isCentral: false,
                text: techWords[Math.floor(Math.random() * techWords.length)],
            });
        }
        
        const generatedEdges: Edge[] = [];
        const edgeSet = new Set<string>();

        for (const nodeA of generatedNodes) {
            const distances = generatedNodes
                .filter(nodeB => nodeA.id !== nodeB.id)
                .map(nodeB => ({
                    node: nodeB,
                    distance: Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y)
                }))
                .sort((a, b) => a.distance - b.distance);

            for (let i = 0; i < NUM_NEIGHBORS && i < distances.length; i++) {
                const nodeB = distances[i].node;
                const edgeId1 = `${nodeA.id}-${nodeB.id}`;
                const edgeId2 = `${nodeB.id}-${nodeA.id}`;
                
                if (!edgeSet.has(edgeId1) && !edgeSet.has(edgeId2)) {
                    generatedEdges.push({ id: edgeId1, from: nodeA.id, to: nodeB.id });
                    edgeSet.add(edgeId1);
                }
            }
        }

        return { nodes: generatedNodes, edges: generatedEdges };
    }, []);

    useEffect(() => {
        const queue: (number | string)[] = [0]; // Start with the central node (ID 0)
        const processed = new Set<string | number>();
        processed.add(0);
        
        const intervalId = setInterval(() => {
            if (queue.length > 0) {
                const currentId = queue.shift()!;
                
                setActivatedItems(prev => new Set(prev).add(String(currentId)));
                
                const connectedEdges = edges.filter(edge => edge.from === currentId || edge.to === currentId);

                for (const edge of connectedEdges) {
                    const neighborId = edge.from === currentId ? edge.to : edge.from;
                    if (!processed.has(edge.id)) {
                        queue.push(edge.id);
                        processed.add(edge.id);
                    }
                    if (!processed.has(neighborId)) {
                        queue.push(neighborId);
                        processed.add(neighborId);
                    }
                }
            } else {
                clearInterval(intervalId);
            }
        }, ANIMATION_INTERVAL);

        const timeoutId = setTimeout(() => {
            setIsHidden(true);
            // Wait for the fade-out transition to complete before calling onLoadingComplete
            setTimeout(onLoadingComplete, 500);
        }, TOTAL_ANIMATION_DURATION);
        
        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [nodes, edges, onLoadingComplete]);

    const getEdgePath = (edge: Edge): string => {
        const fromNode = nodes.find(n => n.id === edge.from)!;
        const toNode = nodes.find(n => n.id === edge.to)!;
        const sx = fromNode.x;
        const sy = fromNode.y;
        const ex = toNode.x;
        const ey = toNode.y;
        const c1x = sx + (ex - sx) * 0.5;
        const c2x = ex - (ex - sx) * 0.5;
        return `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ey}, ${ex} ${ey}`;
    };

    return (
        <div className={`splash-screen ${isHidden ? 'hidden' : ''}`}>
            <svg className="splash-svg" aria-hidden="true">
                <g>
                    {edges.map(edge => (
                        <path
                            key={edge.id}
                            d={getEdgePath(edge)}
                            className={`splash-line ${activatedItems.has(edge.id) ? 'activated' : ''}`}
                        />
                    ))}
                </g>
            </svg>
            {nodes.map(node => (
                <div
                    key={node.id}
                    className={`splash-node ${node.isCentral ? 'central' : ''} ${activatedItems.has(String(node.id)) ? 'activated' : ''}`}
                    style={{
                        width: `${node.width}px`,
                        height: `${node.height}px`,
                        left: `${node.x - node.width / 2}px`,
                        top: `${node.y - node.height / 2}px`,
                    }}
                >
                    {node.isCentral && (
                        <h1 className="splash-title">
                            Robole<span className="glitch-text" data-text="AI">AI</span>
                        </h1>
                    )}
                    {node.text && <span className="splash-node-text">{node.text}</span>}
                </div>
            ))}
            <footer className="splash-footer">
                Powered By GrzesKlep
            </footer>
        </div>
    );
};