import { FC } from 'react';
import { useAgents, AgentConfig } from '../hooks/useAgents';
import { useSchema } from '../hooks/useSchema';
import { agentIcons } from './StworzAgenta';
import { EditIcon, DeleteIcon, AddToSchemaIcon } from '../icons';

interface MoiAgenciProps {
  onNavigate: (page: string) => void;
}

const MoiAgenci: FC<MoiAgenciProps> = ({ onNavigate }) => {
    const { agents, deleteAgent } = useAgents();
    const { addItemToSchema } = useSchema();

    const handleEdit = (agentId: string) => {
        // We use a query parameter to indicate which agent to edit
        window.location.hash = `Stwórz Agenta?edit=${agentId}`;
    };

    const handleAddToSchema = (agent: AgentConfig) => {
        addItemToSchema(agent);
        onNavigate('Interaktywny schemat');
    };

    const AgentIcon = ({iconName}: {iconName: string}) => {
        const icon = agentIcons.find(i => i.name === iconName);
        const IconComponent = icon ? icon.component : agentIcons[0].component;
        return <IconComponent />;
    }

    return (
        <main className="main-content">
            <section aria-labelledby="page-title" className="config-page">
                <h2 id="page-title">Moi Agenci</h2>
                <p>Zarządzaj swoimi agentami, edytuj ich lub dodawaj do interaktywnego schematu.</p>

                {agents.length === 0 ? (
                    <p>Nie stworzyłeś jeszcze żadnych agentów. Przejdź do zakładki "Stwórz Agenta", aby rozpocząć.</p>
                ) : (
                    <div className="agent-list">
                        {agents.map(agent => (
                            <div key={agent.id} className="agent-card">
                                <div className="agent-card-header">
                                    <div className="agent-card-icon">
                                        <AgentIcon iconName={agent.icon} />
                                    </div>
                                    <h3 className="agent-card-title">{agent.name}</h3>
                                </div>
                                <div className="agent-card-actions">
                                    <button onClick={() => handleEdit(agent.id)} aria-label={`Edytuj agenta ${agent.name}`}>
                                        <EditIcon />
                                    </button>
                                    <button onClick={() => deleteAgent(agent.id)} className="delete-btn" aria-label={`Usuń agenta ${agent.name}`}>
                                        <DeleteIcon />
                                    </button>
                                    <button onClick={() => handleAddToSchema(agent)} aria-label={`Dodaj agenta ${agent.name} do schematu`}>
                                        <AddToSchemaIcon />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
};

export default MoiAgenci;