import { FC, useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { InfoIcon } from '../icons';

const API_KEYS_STORAGE_KEY = 'api-keys';
const CUSTOM_PROVIDERS_STORAGE_KEY = 'custom-api-providers';
const SERVER_CONFIG_STORAGE_KEY = 'server-connection-config';

interface ApiProvider {
    id: string;
    name: string;
    isCustom?: boolean;
}

interface ServerConfig {
    type: 'rest' | 'nodejs' | 'python';
    url: string;
    authType: 'none' | 'bearer' | 'apiKey';
    authToken: string;
    apiKeyHeader: string;
}

const initialApiProviders: ApiProvider[] = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'cohere', name: 'Cohere' },
    { id: 'huggingface', name: 'Hugging Face' },
    { id: 'groq', name: 'Groq' },
    { id: 'facebook', name: 'Facebook API' },
    { id: 'mistral', name: 'Mistral AI' },
];

type StatusType = 'idle' | 'success' | 'error' | 'testing';
interface StatusState {
    message: string;
    type: StatusType;
}

type ConnectionStatusType = 'not-configured' | 'testing' | 'success' | 'error';

const defaultTestCode = `// Kod testowy musi zwracać true w przypadku sukcesu lub rzucać błąd.
// Zmienna 'apiKey' jest dostępna w tym zakresie.
// Przykład dla fikcyjnego API:
try {
  const response = await fetch('https://api.example.com/v1/test', {
    headers: { 'Authorization': \`Bearer \${apiKey}\` }
  });

  if (!response.ok) {
    throw new Error(\`API zwróciło status \${response.status}\`);
  }

  const data = await response.json();
  // Sprawdź pole w odpowiedzi, aby potwierdzić sukces
  return data.status === 'ok';
} catch (error) {
  console.error('Test nie powiódł się:', error);
  throw error; // Rzucenie błędu oznaczy test jako nieudany
}`;

const Ustawienia: FC = () => {
    const [providers, setProviders] = useState<ApiProvider[]>(initialApiProviders);
    const [inputValues, setInputValues] = useState<Record<string, string>>({});
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [statuses, setStatuses] = useState<Record<string, StatusState>>({});

    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

    // State for the custom provider form
    const [customName, setCustomName] = useState('');
    const [customKey, setCustomKey] = useState('');
    const [customTestCode, setCustomTestCode] = useState(defaultTestCode);
    
    // State for server connection config
    const [serverConfig, setServerConfig] = useState<ServerConfig>({
        type: 'rest',
        url: '',
        authType: 'none',
        authToken: '',
        apiKeyHeader: 'X-API-Key',
    });
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>('not-configured');
    const [connectionStatusMessage, setConnectionStatusMessage] = useState('Nieskonfigurowano');


    useEffect(() => {
        // Load API Keys
        try {
            const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
            if (storedKeys) {
                const parsedKeys = JSON.parse(storedKeys);
                setApiKeys(parsedKeys);
                setInputValues(parsedKeys);
            }
        } catch (error) {
            console.error("Błąd podczas wczytywania kluczy API z localStorage", error);
        }

        // Load Custom Providers
        try {
            const storedCustomProviders = localStorage.getItem(CUSTOM_PROVIDERS_STORAGE_KEY);
            if (storedCustomProviders) {
                const customProviders = JSON.parse(storedCustomProviders);
                setProviders(prev => [...initialApiProviders, ...customProviders]);
            }
        } catch (error) {
            console.error("Błąd podczas wczytywania niestandardowych dostawców z localStorage", error);
        }
        
        // Load Server Config
        try {
            const storedConfig = localStorage.getItem(SERVER_CONFIG_STORAGE_KEY);
            if (storedConfig) {
                setServerConfig(JSON.parse(storedConfig));
                setConnectionStatus('not-configured');
                setConnectionStatusMessage('Konfiguracja wczytana. Przetestuj połączenie.')
            }
        } catch (error) {
            console.error("Błąd podczas wczytywania konfiguracji serwera z localStorage", error);
        }

    }, []);

    const setProviderStatus = (id: string, message: string, type: StatusType, duration: number = 3000) => {
        setStatuses(prev => ({ ...prev, [id]: { message, type } }));
        if (duration > 0) {
            setTimeout(() => setStatuses(prev => ({ ...prev, [id]: { message: '', type: 'idle' } })), duration);
        }
    };

    const handleSave = (id: string) => {
        const newKeys = { ...apiKeys, [id]: inputValues[id] || '' };
        setApiKeys(newKeys);
        localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(newKeys));
        setProviderStatus(id, 'Klucz zapisany pomyślnie!', 'success');
    };

    const handleDeleteKey = (id: string) => {
        if (window.confirm(`Czy na pewno chcesz usunąć klucz API dla ${providers.find(p => p.id === id)?.name}?`)) {
            const { [id]: _, ...remainingKeys } = apiKeys;
            const { [id]: __, ...remainingInputs } = inputValues;
            setApiKeys(remainingKeys);
            setInputValues(remainingInputs);
            localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(remainingKeys));
            setProviderStatus(id, 'Klucz usunięty.', 'success');
        }
    };
    
    const handleDeleteProvider = (id: string) => {
        const providerName = providers.find(p => p.id === id)?.name;
        if(window.confirm(`Czy na pewno chcesz trwale usunąć dostawcę "${providerName}"? Spowoduje to również usunięcie zapisanego klucza API.`)) {
            // Delete key first
            handleDeleteKey(id);
            
            // Then delete provider
            const newProviders = providers.filter(p => p.id !== id);
            setProviders(newProviders);
            
            const customProviders = newProviders.filter(p => p.isCustom);
            localStorage.setItem(CUSTOM_PROVIDERS_STORAGE_KEY, JSON.stringify(customProviders));
        }
    }

    const handleTest = async (id: string, testCode?: string) => {
        const apiKey = inputValues[id] || apiKeys[id];
        if (!apiKey) {
            setProviderStatus(id, 'Błąd: Klucz API jest pusty.', 'error');
            return;
        }

        setProviderStatus(id, 'Testowanie połączenia...', 'testing', 0);

        if (testCode) { // Custom provider test
            try {
                // Wrap user code in an async function to handle promises
                const testFunction = new Function('apiKey', `return (async () => { ${testCode} })()`);
                const result = await testFunction(apiKey);
                if (result === true) {
                    setProviderStatus(id, 'Połączenie udane!', 'success');
                } else {
                    setProviderStatus(id, `Test zakończony, ale nie zwrócił 'true'.`, 'error');
                }
            } catch (error) {
                setProviderStatus(id, `Błąd testu: ${(error as Error).message}`, 'error');
            }
        } else { // Pre-defined provider test (simulation)
            setTimeout(() => {
                setProviderStatus(id, 'Połączenie udane! (Symulacja)', 'success');
            }, 1500);
        }
    };
    
    const handleInputChange = (id: string, value: string) => {
        setInputValues(prev => ({ ...prev, [id]: value }));
    };

    const handleAddCustomProvider = async (e: FormEvent) => {
        e.preventDefault();
        if(!customName.trim() || !customKey.trim()){
            alert("Nazwa dostawcy i klucz API są wymagane.");
            return;
        }

        const newProviderId = `custom_${customName.trim().toLowerCase().replace(/\s+/g, '_')}`;
        if(providers.some(p => p.id === newProviderId)) {
            alert("Dostawca o tej nazwie już istnieje.");
            return;
        }

        const newProvider: ApiProvider = {
            id: newProviderId,
            name: customName.trim(),
            isCustom: true
        };
        
        // Add to providers list
        const updatedProviders = [...providers, newProvider];
        setProviders(updatedProviders);
        const customProviders = updatedProviders.filter(p => p.isCustom);
        localStorage.setItem(CUSTOM_PROVIDERS_STORAGE_KEY, JSON.stringify(customProviders));

        // Save its key
        setInputValues(prev => ({...prev, [newProviderId]: customKey}));
        const newKeys = { ...apiKeys, [newProviderId]: customKey };
        setApiKeys(newKeys);
        localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(newKeys));

        // Test it
        await handleTest(newProviderId, customTestCode);

        // Reset form
        setCustomName('');
        setCustomKey('');
    }

    // --- Server Connection Handlers ---
    const handleServerConfigChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setServerConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveServerConfig = (e: FormEvent) => {
        e.preventDefault();
        localStorage.setItem(SERVER_CONFIG_STORAGE_KEY, JSON.stringify(serverConfig));
        alert('Konfiguracja serwera została zapisana.');
        if (connectionStatus !== 'success') {
            setConnectionStatus('not-configured');
            setConnectionStatusMessage('Konfiguracja zapisana. Przetestuj połączenie.');
        }
    };
    
    const handleTestConnection = async () => {
        if (!serverConfig.url) {
            setConnectionStatus('error');
            setConnectionStatusMessage('URL serwera nie może być pusty.');
            return;
        }
        setConnectionStatus('testing');
        setConnectionStatusMessage('Testowanie...');
    
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (serverConfig.authType === 'bearer' && serverConfig.authToken) {
                headers['Authorization'] = `Bearer ${serverConfig.authToken}`;
            } else if (serverConfig.authType === 'apiKey' && serverConfig.apiKeyHeader && serverConfig.authToken) {
                headers[serverConfig.apiKeyHeader] = serverConfig.authToken;
            }
    
            // We assume a /health endpoint exists on the user's server. This is a common practice.
            const response = await fetch(`${serverConfig.url}/health`, {
                method: 'GET',
                headers,
            });
    
            if (response.ok) {
                setConnectionStatus('success');
                setConnectionStatusMessage('Połączenie udane!');
            } else {
                throw new Error(`Serwer odpowiedział statusem ${response.status}`);
            }
        } catch (error) {
            setConnectionStatus('error');
            let message = `Błąd połączenia: ${(error as Error).message}.`;
            if ((error as Error).message.includes('Failed to fetch')) {
                message += ' Sprawdź URL, ustawienia CORS na serwerze lub czy serwer jest uruchomiony.';
            }
            setConnectionStatusMessage(message);
        }
    };
    
    const handleDeleteServerConfig = () => {
        if (window.confirm('Czy na pewno chcesz usunąć konfigurację połączenia z serwerem?')) {
            localStorage.removeItem(SERVER_CONFIG_STORAGE_KEY);
            setServerConfig({
                type: 'rest',
                url: '',
                authType: 'none',
                authToken: '',
                apiKeyHeader: 'X-API-Key',
            });
            setConnectionStatus('not-configured');
            setConnectionStatusMessage('Nieskonfigurowano');
            alert('Konfiguracja usunięta.');
        }
    };
    
    const ConnectionStatusIndicator = () => {
        const statusMap = {
            'not-configured': { text: 'Nieskonfigurowano', className: '' },
            'testing': { text: 'Testowanie...', className: 'testing' },
            'success': { text: 'Połączono', className: 'success' },
            'error': { text: 'Błąd', className: 'error' },
        };
        const { text, className } = statusMap[connectionStatus];
        return <span className={`connection-status ${className}`}>{text}</span>;
    };

    const AboutModal = () => (
        <div className="modal-overlay" onClick={() => setIsAboutModalOpen(false)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>O Autorze Aplikacji</h3>
                </div>
                <div className="modal-body about-modal-content" style={{paddingRight: '0', marginRight: '0'}}>
                    <p><strong>Witaj w Kreatorze Agentów AI!</strong></p>
                    <p>Nazywam się Grzegorz Klepadło (vel GrzesKlep) i jestem twórcą tej aplikacji. Moja pasja to projektowanie i budowanie innowacyjnych rozwiązań, które łączą świat oprogramowania z potęgą sztucznej inteligencji.</p>
                    
                    <h4>Specjalizacje</h4>
                    <ul>
                        <li>Spersonalizowanych agentów AI, dostosowanych do konkretnych potrzeb biznesowych.</li>
                        <li>Zaawansowanych aplikacji webowych i systemów automatyzacji procesów.</li>
                    </ul>
                    <p>Od koncepcji, przez logikę, aż po każdy detal graficzny – cała ta aplikacja jest moim autorskim dziełem.</p>

                    <div className="contact-info">
                        <h4>Skontaktuj się ze mną</h4>
                        <p>Masz pomysł na projekt lub potrzebujesz dedykowanego agenta AI? Chętnie pomogę!</p>
                        <p><strong>Telefon:</strong> 730 819 654</p>
                        <p><strong>Email:</strong> <a href="mailto:klepadlogrzegorz5@gmail.com">klepadlogrzegorz5@gmail.com</a></p>
                    </div>

                    <div className="modal-copyright">
                        <p>&copy; {new Date().getFullYear()} Grzegorz Klepadło. Wszelkie prawa zastrzeżone.</p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-save" onClick={() => setIsAboutModalOpen(false)}>Zamknij</button>
                </div>
            </div>
        </div>
    );

    return (
        <main className="main-content">
            {isAboutModalOpen && <AboutModal />}
            <section aria-labelledby="page-title" className="config-page">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 id="page-title">Ustawienia</h2>
                    <button className="btn btn-save" onClick={() => setIsAboutModalOpen(true)}>
                        <InfoIcon /> O autorze
                    </button>
                </div>
                <h3 id="api-keys-title">Klucze API Modeli Językowych</h3>
                <p>Zarządzaj swoimi kluczami API. Klucze są przechowywane wyłącznie w Twojej przeglądarce.</p>
                <div className="config-container">
                    {providers.map(({ id, name, isCustom }) => (
                        <div key={id} className="api-provider-card">
                            <div className="api-provider-header">
                                <h4>{name} {isCustom && <span style={{fontSize: '0.8rem', color: 'var(--warning-color)'}}>(Niestandardowy)</span>}</h4>
                                {apiKeys[id] ? (
                                    <span className="api-status configured">Skonfigurowano</span>
                                ) : (
                                    <span className="api-status not-configured">Brak klucza</span>
                                )}
                            </div>
                            <div className="api-provider-content">
                                <div className="api-key-input-wrapper">
                                    <input
                                        id={`api-key-${id}`}
                                        type="password"
                                        className="styled-input"
                                        value={inputValues[id] || ''}
                                        onChange={(e) => handleInputChange(id, e.target.value)}
                                        placeholder={`Wprowadź klucz API dla ${name}...`}
                                        aria-label={`Klucz API dla ${name}`}
                                    />
                                </div>
                                <div className="api-provider-actions">
                                    <button onClick={() => handleSave(id)} className="btn btn-save">Zapisz</button>
                                    <button onClick={() => handleTest(id)} className="btn btn-test" disabled={isCustom}>Testuj {isCustom && '(Użyj formularza)'}</button>
                                    {apiKeys[id] && (
                                        <button onClick={() => handleDeleteKey(id)} className="btn btn-delete">Usuń klucz</button>
                                    )}
                                     {isCustom && (
                                        <button onClick={() => handleDeleteProvider(id)} className="btn btn-delete">Usuń dostawcę</button>
                                    )}
                                    {statuses[id]?.message && (
                                        <span className={`status-message ${statuses[id].type}`}>
                                            {statuses[id].message}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="api-provider-card">
                         <div className="api-provider-header">
                            <h4>Dodaj własnego dostawcę</h4>
                         </div>
                         <form className="api-provider-content" onSubmit={handleAddCustomProvider}>
                            <label htmlFor="custom-name">Nazwa dostawcy</label>
                            <input id="custom-name" type="text" className="styled-input" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Np. Moje Niestandardowe API" required />
                            
                            <label htmlFor="custom-key" style={{marginTop: '1rem'}}>API Key / Token</label>
                             <input id="custom-key" type="password" className="styled-input" value={customKey} onChange={e => setCustomKey(e.target.value)} placeholder="Wprowadź swój klucz lub token" required />

                            <label htmlFor="custom-test-code" style={{marginTop: '1rem'}}>Kod testowy (JavaScript)</label>
                            <p style={{fontSize: '0.9rem', margin: '0 0 0.5rem 0', color: 'var(--warning-color)'}}>Uwaga: Ten kod zostanie wykonany w Twojej przeglądarce. Nie używaj niezaufanego kodu.</p>
                            <textarea id="custom-test-code" className="styled-textarea" style={{minHeight: '200px', fontFamily: 'monospace'}} value={customTestCode} onChange={e => setCustomTestCode(e.target.value)} />
                            
                            <div className="api-provider-actions">
                                <button type="submit" className="btn btn-save">Dodaj i przetestuj</button>
                            </div>
                         </form>
                    </div>

                    <div className="server-config-card api-provider-card">
                         <div className="api-provider-header">
                            <h3 id="server-config-title">Połączenie z Serwerem Backend</h3>
                            <ConnectionStatusIndicator />
                         </div>
                         <form className="api-provider-content" onSubmit={handleSaveServerConfig}>
                            <div className="config-group">
                                <label htmlFor="server-type">Typ serwera</label>
                                <select id="server-type" name="type" className="styled-select" value={serverConfig.type} onChange={handleServerConfigChange}>
                                    <option value="rest">Ogólny REST API</option>
                                    <option value="nodejs">Node.js (Express)</option>
                                    <option value="python">Python (Flask/FastAPI)</option>
                                </select>
                            </div>
                             <div className="config-group">
                                <label htmlFor="server-url">Adres URL serwera</label>
                                <input id="server-url" name="url" type="url" className="styled-input" value={serverConfig.url} onChange={handleServerConfigChange} placeholder="np. http://localhost:8080" />
                            </div>
                            <div className="config-group">
                                <label htmlFor="auth-type">Typ autoryzacji</label>
                                <select id="auth-type" name="authType" className="styled-select" value={serverConfig.authType} onChange={handleServerConfigChange}>
                                    <option value="none">Brak</option>
                                    <option value="bearer">Bearer Token</option>
                                    <option value="apiKey">Klucz API (Nagłówek)</option>
                                </select>
                            </div>
                            
                            {serverConfig.authType === 'bearer' && (
                                <div className="config-group">
                                    <label htmlFor="auth-token">Bearer Token</label>
                                    <input id="auth-token" name="authToken" type="password" className="styled-input" value={serverConfig.authToken} onChange={handleServerConfigChange} placeholder="Wprowadź swój token" />
                                </div>
                            )}

                             {serverConfig.authType === 'apiKey' && (
                                <div className="config-group">
                                    <label>Klucz API i Nagłówek</label>
                                    <div className="input-group">
                                        <input name="apiKeyHeader" type="text" className="styled-input" value={serverConfig.apiKeyHeader} onChange={handleServerConfigChange} placeholder="Nazwa nagłówka, np. X-API-Key" />
                                        <input name="authToken" type="password" className="styled-input" value={serverConfig.authToken} onChange={handleServerConfigChange} placeholder="Wartość klucza API" />
                                    </div>
                                </div>
                            )}
                            
                            {connectionStatus === 'error' && (
                                <p className="status-message error">{connectionStatusMessage}</p>
                            )}

                            <div className="api-provider-actions" style={{marginTop: '1.5rem'}}>
                                <button type="submit" className="btn btn-save">Zapisz</button>
                                <button type="button" onClick={handleTestConnection} className="btn btn-test" disabled={connectionStatus === 'testing'}>
                                    {connectionStatus === 'testing' ? 'Testowanie...' : 'Testowanie...'}
                                </button>
                                <button type="button" onClick={handleDeleteServerConfig} className="btn btn-delete">Wyczyść</button>
                            </div>
                         </form>
                         <div className="cors-info-box">
                            <h4>Ważna informacja dla deweloperów Backend: Konfiguracja CORS</h4>
                            <p>
                                Aby umożliwić tej aplikacji komunikację z Twoim serwerem, backend musi zezwalać na żądania pochodzące z innej domeny. Jest to standardowy mechanizm bezpieczeństwa przeglądarek internetowych znany jako <strong>Cross-Origin Resource Sharing (CORS)</strong>.
                            </p>
                            <p>
                                Twój serwer musi zawierać w odpowiedziach odpowiednie nagłówki HTTP, w szczególności <code>Access-Control-Allow-Origin</code>. Poniżej znajdują się przykłady dla popularnych frameworków.
                            </p>

                            <h5>Node.js (Express)</h5>
                            <p>Zainstaluj pakiet <code>cors</code>: <code>npm install cors</code>, a następnie dodaj go do swojej aplikacji.</p>
                            <pre><code>
{`const express = require('express');
const cors = require('cors');
const app = express();

// Dla celów deweloperskich, można zezwolić wszystkim (*):
app.use(cors());

/* W środowisku produkcyjnym, ogranicz do konkretnej domeny:
app.use(cors({
  origin: 'https://twoja-domena-frontend.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', '${serverConfig.authType === 'apiKey' ? serverConfig.apiKeyHeader : 'X-API-Key'}']
}));
*/

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(8080);`}
                            </code></pre>

                            <h5>Python (Flask)</h5>
                            <p>Zainstaluj pakiet <code>flask-cors</code>: <code>pip install flask-cors</code>.</p>
                            <pre><code>
{`from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Zastosuj CORS do całej aplikacji
CORS(app) 

# W produkcji, ogranicz do domeny i konkretnych zasobów:
# cors = CORS(app, resources={
#   r"/*": {
#     "origins": "https://twoja-domena-frontend.com"
#   }
# })

@app.route('/health')
def health_check():
    return jsonify(status='ok')`}
                            </code></pre>
                            
                             <h5>Python (FastAPI)</h5>
                            <p>Użyj wbudowanego <code>CORSMiddleware</code>.</p>
                            <pre><code>
{`from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    # Dla deweloperów zezwól na wszystko
    "*",
    # W produkcji podaj konkretne domeny
    # "https://twoja-domena-frontend.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}`}
                            </code></pre>
                        </div>
                    </div>

                </div>
            </section>
        </main>
    );
};

export default Ustawienia;