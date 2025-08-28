import { FC, useState, ChangeEvent } from 'react';
import { CustomItem } from '../hooks/useCustomItems';
import { iconMap, ToolsIcon } from '../icons';

interface CreateItemModalProps {
    type: 'tool' | 'node';
    onClose: () => void;
    onSave: (item: Omit<CustomItem, 'id'>) => void;
}

const defaultToolCode = `// Dostępne zmienne: 'args' (obiekt z parametrami)
// Musisz zwrócić wynik (string, number, object).
// Przykład:
// return \`Otrzymano tekst: \${args.textInput}\`;

return "Logika niezaimplementowana.";
`;

export const CreateItemModal: FC<CreateItemModalProps> = ({ type, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [iconName, setIconName] = useState('Tools');

    // Tool specific
    const [functionName, setFunctionName] = useState('');
    const [functionDescription, setFunctionDescription] = useState('');
    const [parameters, setParameters] = useState<{name: string, type: string, description: string}[]>([]);
    const [executionCode, setExecutionCode] = useState(defaultToolCode);
    
    // Node specific
    // Fix: Use a stricter type for `type` property to match CustomItem interface.
    const [inputs, setInputs] = useState<{key: string, label: string, type: 'text' | 'number' | 'textarea', placeholder: string}[]>([]);

    const handleAddParam = () => setParameters([...parameters, { name: '', type: 'STRING', description: '' }]);
    const handleRemoveParam = (index: number) => setParameters(parameters.filter((_, i) => i !== index));
    const handleParamChange = (index: number, field: string, value: string) => {
        const newParams = [...parameters];
        newParams[index] = { ...newParams[index], [field]: value };
        setParameters(newParams);
    };
    
    const handleAddInput = () => setInputs([...inputs, { key: '', label: '', type: 'text', placeholder: ''}]);
    const handleRemoveInput = (index: number) => setInputs(inputs.filter((_, i) => i !== index));
    const handleInputChange = (index: number, field: string, value: string) => {
        const newInputs = [...inputs];
        // The cast is necessary because TypeScript can't infer the type with a dynamic key `[field]`.
        // This is safe here as we control the inputs.
        newInputs[index] = { ...newInputs[index], [field]: value } as typeof inputs[0];
        setInputs(newInputs);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !description || !iconName) {
            alert('Nazwa, opis i ikona są wymagane.');
            return;
        }

        const baseItem = { name, description, iconName, type };
        let finalItem: Omit<CustomItem, 'id'>;

        if (type === 'tool') {
             if (!functionName || !functionDescription) {
                alert('Nazwa i opis funkcji są wymagane dla narzędzia.');
                return;
            }
            finalItem = { ...baseItem, functionName, functionDescription, parameters, executionCode, isCustom: true };
        } else {
            finalItem = { ...baseItem, inputs: inputs.map(i => ({...i, defaultValue: ''})), isCustom: true };
        }

        onSave(finalItem);
    };
    
    const SelectedIcon = iconMap[iconName] || ToolsIcon;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h3>Stwórz nowe {type === 'tool' ? 'narzędzie' : 'węzeł'}</h3>
                    </div>
                    <div className="modal-body">
                        <div className="config-group">
                            <label htmlFor="item-name">Nazwa</label>
                            <input id="item-name" type="text" className="styled-input" value={name} onChange={e => setName(e.target.value)} placeholder="np. Mój super-węzeł" required />
                        </div>
                         <div className="config-group">
                            <label htmlFor="item-desc">Opis</label>
                            <textarea id="item-desc" className="styled-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Opisz, co robi ten element" required />
                        </div>
                        <div className="config-group">
                            <label>Ikona</label>
                             <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
                                <span>Wybrana ikona:</span>
                                <div className="icon-btn active" style={{cursor: 'default'}}><SelectedIcon /></div>
                            </div>
                            <div className="modal-icon-picker">
                                {Object.keys(iconMap).sort().map(key => {
                                    const IconComponent = iconMap[key];
                                    return (
                                        <button type="button" key={key} className={`icon-btn ${iconName === key ? 'active' : ''}`} onClick={() => setIconName(key)} aria-label={`Wybierz ikonę ${key}`}>
                                            <IconComponent />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {type === 'tool' && (
                            <>
                                <h4>Konfiguracja narzędzia (dla AI)</h4>
                                <div className="config-group">
                                    <label htmlFor="func-name">Nazwa funkcji (bez spacji, po angielsku)</label>
                                    <input id="func-name" type="text" className="styled-input" value={functionName} onChange={e => setFunctionName(e.target.value)} placeholder="np. customApiCall" required />
                                </div>
                                <div className="config-group">
                                    <label htmlFor="func-desc">Opis funkcji (dla modelu AI)</label>
                                    <textarea id="func-desc" className="styled-textarea" value={functionDescription} onChange={e => setFunctionDescription(e.target.value)} placeholder="Opisz, kiedy i jak AI powinno używać tej funkcji" required />
                                </div>
                                <div className="config-group">
                                    <label>Parametry funkcji</label>
                                    <div className="param-list">
                                        {parameters.map((param, index) => (
                                            <div key={index} className="param-row">
                                                <input type="text" className="styled-input" value={param.name} onChange={e => handleParamChange(index, 'name', e.target.value)} placeholder="Nazwa parametru" />
                                                <select className="styled-select" value={param.type} onChange={e => handleParamChange(index, 'type', e.target.value)}>
                                                    <option value="STRING">Tekst (String)</option>
                                                    <option value="NUMBER">Liczba (Number)</option>
                                                    <option value="BOOLEAN">Prawda/Fałsz (Boolean)</option>
                                                </select>
                                                <input type="text" className="styled-input" value={param.description} onChange={e => handleParamChange(index, 'description', e.target.value)} placeholder="Opis parametru" />
                                                <button type="button" className="param-remove-btn" onClick={() => handleRemoveParam(index)}>&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={handleAddParam} className="btn btn-test" style={{marginTop: '1rem'}}>Dodaj parametr</button>
                                </div>
                                <div className="config-group">
                                    <label htmlFor="exec-code">Kod wykonawczy (JavaScript)</label>
                                    <textarea id="exec-code" className="styled-textarea" style={{minHeight: '150px', fontFamily: 'monospace'}} value={executionCode} onChange={e => setExecutionCode(e.target.value)} />
                                </div>
                            </>
                        )}

                        {type === 'node' && (
                            <div className="config-group">
                                <label>Pola wejściowe (dla modala konfiguracji)</label>
                                <div className="param-list">
                                    {inputs.map((input, index) => (
                                        <div key={index} className="param-row param-row-node">
                                            <input type="text" className="styled-input" value={input.key} onChange={e => handleInputChange(index, 'key', e.target.value)} placeholder="Klucz (np. 'apiKey')" />
                                            <input type="text" className="styled-input" value={input.label} onChange={e => handleInputChange(index, 'label', e.target.value)} placeholder="Etykieta (np. 'Klucz API')" />
                                            <select className="styled-select" value={input.type} onChange={e => handleInputChange(index, 'type', e.target.value)}>
                                                <option value="text">Tekst</option>
                                                <option value="number">Liczba</option>
                                                <option value="textarea">Pole tekstowe</option>
                                            </select>
                                            <input type="text" className="styled-input" value={input.placeholder} onChange={e => handleInputChange(index, 'placeholder', e.target.value)} placeholder="Placeholder" />
                                            <button type="button" className="param-remove-btn" onClick={() => handleRemoveInput(index)}>&times;</button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={handleAddInput} className="btn btn-test" style={{marginTop: '1rem'}}>Dodaj pole wejściowe</button>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-reset" onClick={onClose}>Anuluj</button>
                        <button type="submit" className="btn btn-save">Zapisz</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
