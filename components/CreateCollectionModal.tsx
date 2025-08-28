import { FC, useState, DragEvent, ChangeEvent, useRef } from 'react';
import { UploadCloudIcon, FileTextIcon, XIcon } from '../icons';

interface CreateCollectionModalProps {
    onClose: () => void;
    onSave: (name: string, files: File[]) => void;
}

// Helper to format file size
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const CreateCollectionModal: FC<CreateCollectionModalProps> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow drop
        e.stopPropagation();
    };
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    };
    
    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    }
    
    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Nazwa kolekcji jest wymagana.');
            return;
        }
        if (files.length === 0) {
            alert('Dodaj przynajmniej jeden plik do kolekcji.');
            return;
        }
        onSave(name, files);
    };
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h3>Stwórz nową kolekcję</h3>
                    </div>
                    <div className="modal-body">
                        <div className="config-group">
                            <label htmlFor="collection-name">Nazwa kolekcji</label>
                            <input 
                                id="collection-name" 
                                type="text" 
                                className="styled-input" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="np. Dokumentacja Projektu 'X'" 
                                required 
                            />
                        </div>
                         <div className="config-group">
                            <label>Pliki</label>
                            <div 
                                className={`file-drop-zone ${isDragging ? 'active' : ''}`}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <UploadCloudIcon className="file-drop-zone-icon" />
                                <p>Przeciągnij i upuść pliki tutaj, lub kliknij, aby wybrać</p>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    multiple 
                                    style={{ display: 'none' }} 
                                />
                            </div>
                            {files.length > 0 && (
                                <div className="file-list">
                                    {files.map((file, index) => (
                                        <div key={index} className="file-list-item">
                                            <FileTextIcon className="file-list-item-icon" />
                                            <div className="file-list-item-details">
                                                <span className="file-name">{file.name}</span>
                                                <span className="file-size">{formatBytes(file.size)}</span>
                                            </div>
                                            <button 
                                                type="button" 
                                                className="file-list-item-remove"
                                                onClick={() => handleRemoveFile(index)}
                                                aria-label={`Usuń plik ${file.name}`}
                                            >
                                                <XIcon style={{width: 18, height: 18}}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-reset" onClick={onClose}>Anuluj</button>
                        <button type="submit" className="btn btn-save">Zapisz kolekcję</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
