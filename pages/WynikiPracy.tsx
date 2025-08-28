import { FC, useState } from 'react';
import { useExecution, ExecutionRun, ExecutionEvent } from '../hooks/useExecution';
import { ClearIcon, CodeIcon, ErrorIcon, MyAgentsIcon, ToolsIcon, ResultsIcon, FileTextIcon, UploadCloudIcon } from '../icons';

const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
};

const getStatusIcon = (status: ExecutionEvent['status']) => {
    switch (status) {
        case 'started': return <MyAgentsIcon style={{ color: 'var(--accent-color)' }}/>;
        case 'success': return <ToolsIcon style={{ color: 'var(--success-color)' }} />;
        case 'error': return <ErrorIcon style={{ color: 'var(--error-color)' }} />;
        default: return <CodeIcon />;
    }
}

const RichDataViewer: FC<{ data: any }> = ({ data }) => {
    if (data === null || data === undefined) return null;

    if (typeof data === 'string') {
        // Don't render plain strings if they are short, as they're likely part of the main message.
        // Render longer strings as text blocks.
        if (data.length < 100 && !data.includes('\n')) return null;
        return (
            <div className="rich-data text-data">
                <pre><code>{data}</code></pre>
            </div>
        );
    }
    
    if (typeof data === 'object') {
        if (data.__rich_data_type__ === 'image') {
            return (
                <div className="rich-data image-data">
                    <img src={`data:image/png;base64,${data.base64}`} alt={data.alt} />
                    <p>{data.alt}</p>
                </div>
            );
        }
        if (data.__rich_data_type__ === 'file') {
            return (
                <div className="rich-data file-data">
                    <div className="file-data-header">
                        <FileTextIcon />
                        <span>{data.filename}</span>
                    </div>
                    <a 
                        href={`data:${data.mimeType};base64,${data.content}`}
                        download={data.filename}
                        className="btn btn-save"
                    >
                        <UploadCloudIcon /> Pobierz plik
                    </a>
                </div>
            );
        }
        if (data.groundingChunks) {
             return (
                <div className="rich-data json-data">
                    <h4>Źródła z wyszukiwarki:</h4>
                    <ul>
                        {(data.groundingChunks as any[]).map((chunk, i) => (
                            <li key={i}>
                                <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer">
                                    {chunk.web.title || chunk.web.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
             );
        }
        // Generic object/JSON viewer
        return (
            <div className="rich-data json-data">
                <pre><code>{JSON.stringify(data, null, 2)}</code></pre>
            </div>
        );
    }
    
    // For other primitives like numbers
    return (
        <div className="rich-data text-data">
            <pre><code>{String(data)}</code></pre>
        </div>
    );
};

const WynikiPracy: FC = () => {
    const { runs, clearLogs } = useExecution();
    const [expandedRun, setExpandedRun] = useState<string | null>(runs.length > 0 ? runs[0].id : null);
    
    const toggleRun = (runId: string) => {
        setExpandedRun(prev => (prev === runId ? null : runId));
    };

    return (
        <main className="main-content">
            <section aria-labelledby="page-title" className="config-page">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 id="page-title">Wyniki pracy</h2>
                    {runs.length > 0 && (
                        <button onClick={clearLogs} className="btn btn-reset" style={{backgroundColor: '#555'}}>
                            <ClearIcon /> Wyczyść logi
                        </button>
                    )}
                </div>
                <p>Przeglądaj historię wykonania swoich schematów.</p>

                {runs.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '4rem', color: 'rgba(255,255,255,0.5)' }}>
                        <ResultsIcon style={{ width: '64px', height: '64px', color: 'rgba(255,255,255,0.3)' }} />
                        <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>Brak wyników do wyświetlenia.</p>
                        <p>Uruchom schemat na stronie "Interaktywny schemat", aby zobaczyć tutaj logi wykonania.</p>
                    </div>
                ) : (
                    <div className="logs-container">
                        {runs.map(run => (
                            <details key={run.id} className="run-log-details" open={expandedRun === run.id}>
                                <summary className={`run-log-summary ${run.status}`} onClick={(e) => { e.preventDefault(); toggleRun(run.id); }}>
                                    <div className="run-summary-info">
                                        <span className={`run-status-badge ${run.status}`}>{run.status}</span>
                                        <strong>Run ID:</strong> {run.id}
                                    </div>
                                    <div className="run-summary-time">
                                        <span>{formatDate(run.startTimestamp)}</span>
                                    </div>
                                </summary>
                                <div className="run-log-content">
                                    <ul className="run-events-list">
                                        {run.events.map((event, index) => (
                                            <li key={index} className={`run-event-item ${event.status}`}>
                                                <div className="event-icon">{getStatusIcon(event.status)}</div>
                                                <div className="event-details">
                                                    <span className="event-node-name">{event.nodeName}</span>
                                                    <span className="event-message">{event.message}</span>
                                                    <RichDataViewer data={event.data} />
                                                </div>
                                                <span className="event-timestamp">{new Date(event.timestamp).toLocaleTimeString('pl-PL')}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
};

export default WynikiPracy;