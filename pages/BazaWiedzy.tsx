import { FC, useState } from 'react';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';
import { CreateCollectionModal } from '../components/CreateCollectionModal';
import { FolderIcon, DatabaseIcon, DeleteIcon, FileTextIcon } from '../icons';

const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const BazaWiedzy: FC = () => {
    const { collections, addCollection, deleteCollection } = useKnowledgeBase();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSaveCollection = (name: string, files: File[]) => {
        addCollection(name, files);
        setIsModalOpen(false);
    };

    return (
        <main className="main-content">
            {isModalOpen && (
                <CreateCollectionModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveCollection}
                />
            )}
            <section aria-labelledby="page-title" className="config-page">
                 <div className="page-actions">
                     <h2 id="page-title">Baza Wiedzy</h2>
                    <button className="btn btn-save" style={{marginLeft: 'auto'}} onClick={() => setIsModalOpen(true)}>
                        <FolderIcon /> Stwórz nową kolekcję
                    </button>
                </div>
                <p>Zarządzaj swoimi kolekcjami dokumentów. Będą one mogły być wykorzystywane przez agentów do udzielania odpowiedzi w oparciu o konkretne dane.</p>

                {collections.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '4rem', color: 'rgba(255,255,255,0.5)' }}>
                        <DatabaseIcon style={{ width: '64px', height: '64px', color: 'rgba(255,255,255,0.3)' }} />
                        <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>Brak kolekcji w bazie wiedzy.</p>
                        <p>Stwórz swoją pierwszą kolekcję, aby dodać dokumenty, z których będą mogli korzystać Twoi agenci.</p>
                    </div>
                ) : (
                    <div className="collection-list">
                        {collections.map(collection => (
                            <div key={collection.id} className="collection-card">
                                <div className="collection-card-header">
                                    <h3 className="collection-card-title">{collection.name}</h3>
                                     <div className="collection-card-actions">
                                        <button onClick={() => deleteCollection(collection.id)} aria-label={`Usuń kolekcję ${collection.name}`}>
                                            <DeleteIcon />
                                        </button>
                                    </div>
                                </div>
                                <div className="collection-card-details">
                                    <p><strong>Utworzono:</strong> {formatDate(collection.createdAt)}</p>
                                    <p><strong><FileTextIcon style={{width: 14, height: 14, verticalAlign: 'middle'}}/> Dokumenty:</strong> {collection.files.length}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
};

export default BazaWiedzy;
