import { FC } from 'react';
import { useProjects, Project } from '../hooks/useProjects';
import { useSchema } from '../hooks/useSchema';
import { DeleteIcon, SchemaIcon, RunIcon } from '../icons';

interface GotoweProjektyProps {
  onNavigate: (page: string) => void;
}

const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const GotoweProjekty: FC<GotoweProjektyProps> = ({ onNavigate }) => {
    const { projects, deleteProject } = useProjects();
    const { loadSchema } = useSchema();

    const handleLoad = (project: Project) => {
        if(loadSchema(project.schema)) {
            onNavigate('Interaktywny schemat');
        }
    };

    const handleRun = (project: Project) => {
        onNavigate(`Interaktywny schemat?runProject=${project.id}`);
    };

    return (
        <main className="main-content">
            <section aria-labelledby="page-title" className="config-page">
                <h2 id="page-title">Gotowe Projekty</h2>
                <p>Zarządzaj zapisanymi schematami. Możesz je wczytać, uruchomić lub usunąć.</p>

                {projects.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '4rem', color: 'rgba(255,255,255,0.5)' }}>
                         <SchemaIcon style={{ width: '64px', height: '64px', color: 'rgba(255,255,255,0.3)' }} />
                        <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>Brak zapisanych projektów.</p>
                        <p>Przejdź do "Interaktywnego schematu", aby stworzyć i zapisać swój pierwszy projekt.</p>
                    </div>
                ) : (
                    <div className="project-list">
                        {projects.map(project => (
                            <div key={project.id} className="project-card">
                                <div className="project-card-header">
                                    <h3 className="project-card-title">{project.name}</h3>
                                </div>
                                <div className="project-card-details">
                                    <p><strong>Utworzono:</strong> {formatDate(project.createdAt)}</p>
                                    <p><strong>Elementy:</strong> {project.schema.items.length}</p>
                                    <p><strong>Połączenia:</strong> {project.schema.connections.length}</p>
                                </div>
                                <div className="project-card-actions">
                                    <button onClick={() => deleteProject(project.id)} className="btn btn-reset" aria-label={`Usuń projekt ${project.name}`}>
                                        <DeleteIcon />
                                    </button>
                                    <button onClick={() => handleLoad(project)} className="btn btn-reset" style={{backgroundColor: '#4a4a4a'}} aria-label={`Wczytaj projekt ${project.name}`}>
                                        Wczytaj
                                    </button>
                                     <button onClick={() => handleRun(project)} className="btn btn-save" aria-label={`Uruchom projekt ${project.name}`}>
                                        <RunIcon /> Uruchom
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

export default GotoweProjekty;