import { FC, useState, FormEvent, ChangeEvent, useMemo } from 'react';
import { useSchema } from '../hooks/useSchema';
import { useCustomeItems, CustomItem } from '../hooks/useCustomItems';
import { CreateItemModal } from '../components/CreateItemModal';
import * as Icons from '../icons';

export interface LibraryItem {
    id: string;
    name: string;
    description: string;
    icon: FC;
    iconName: string;
    type: 'tool' | 'node';
    inputs?: {
        key: string;
        label: string;
        type: 'text' | 'number' | 'textarea';
        defaultValue?: string | number;
        placeholder?: string;
    }[];
    isCustom?: boolean;
}

export const toolsList: Omit<LibraryItem, 'icon'>[] = [
    { id: 'api_call', name: 'Wywołanie API', description: 'Wykonuje żądania GET, POST, etc. do zewnętrznych API.', iconName: 'Api', type: 'tool' },
    { id: 'db_query', name: 'Zapytanie SQL', description: 'Wykonuje zapytania do relacyjnej bazy danych.', iconName: 'Database', type: 'tool' },
    { id: 'file_read', name: 'Odczyt pliku', description: 'Czyta zawartość z wirtualnego systemu plików.', iconName: 'File', type: 'tool' },
    { id: 'file_write', name: 'Zapis do pliku', description: 'Zapisuje dane do pliku w wirtualnym systemie.', iconName: 'File', type: 'tool' },
    { id: 'generate_image', name: 'Generator obrazów', description: 'Tworzy obrazy na podstawie opisu tekstowego przy użyciu modelu Imagen.', iconName: 'Image', type: 'tool' },
    { id: 'code_interpreter', name: 'Interpreter kodu', description: 'Bezpiecznie interpretuje kod (np. JS) używając AI i zwraca jego wynik.', iconName: 'Code', type: 'tool' },
    { id: 'send_email', name: 'Wyślij Email', description: 'Wysyła wiadomość email przez SMTP lub API.', iconName: 'Email', type: 'tool' },
    { id: 'text_summarize', name: 'Streszczenie tekstu', description: 'Skraca długi tekst do kluczowych punktów używając Gemini.', iconName: 'Text', type: 'tool' },
    { id: 'sentiment_analysis', name: 'Analiza sentymentu', description: 'Określa nacechowanie emocjonalne tekstu używając Gemini.', iconName: 'Text', type: 'tool' },
    { id: 'json_parser', name: 'Parser JSON', description: 'Przetwarza i wyodrębnia dane ze stringa JSON.', iconName: 'Json', type: 'tool' },
    { id: 'web_scrape', name: 'Web Scraper', description: 'Pobiera dane ze struktury strony internetowej.', iconName: 'MousePointer', type: 'tool' },
    { id: 'google_calendar', name: 'Kalendarz Google', description: 'Zarządza wydarzeniami w Kalendarzu Google.', iconName: 'Calendar', type: 'tool' },
    { id: 'google_maps', name: 'Mapy Google', description: 'Wyszukuje lokalizacje i wyznacza trasy.', iconName: 'Map', type: 'tool' },
    { id: 'post_tweet', name: 'Opublikuj na Twitterze', description: 'Wysyła nowego tweeta na podłączone konto.', iconName: 'Twitter', type: 'tool' },
    { id: 'send_slack_msg', name: 'Wiadomość na Slacku', description: 'Wysyła wiadomość na kanał lub do użytkownika.', iconName: 'Slack', type: 'tool' },
    { id: 'translate_text', name: 'Tłumacz tekst', description: 'Tłumaczy tekst pomiędzy różnymi językami używając Gemini.', iconName: 'Translate', type: 'tool' },
    { id: 'data_analysis', name: 'Analiza danych', description: 'Przetwarza zbiory danych (CSV, JSON) i generuje statystyki.', iconName: 'ChartBar', type: 'tool' },
    { id: 'video_processing', name: 'Przetwarzanie wideo', description: 'Konwertuje, tnie lub dodaje znaki wodne do wideo.', iconName: 'Video', type: 'tool' },
    { id: 'audio_transcribe', name: 'Transkrypcja audio', description: 'Konwertuje mowę z pliku audio na tekst.', iconName: 'Audio', type: 'tool' },
    { id: 'weather_forecast', name: 'Prognoza pogody', description: 'Pobiera aktualną pogodę dla danej lokalizacji.', iconName: 'Weather', type: 'tool' },
    { id: 'news_api', name: 'Wiadomości', description: 'Pobiera najnowsze nagłówki z serwisów informacyjnych.', iconName: 'Newspaper', type: 'tool' },
    { id: 'stock_price', name: 'Ceny akcji', description: 'Sprawdza aktualne ceny akcji na giełdzie.', iconName: 'TrendingUp', type: 'tool' },
    { id: 'ecommerce_info', name: 'Informacje o produkcie', description: 'Pobiera dane o produkcie ze sklepu (np. Shopify).', iconName: 'ShoppingCart', type: 'tool' },
    { id: 'shell_command', name: 'Polecenie powłoki', description: 'Wykonuje polecenie w terminalu systemowym.', iconName: 'Terminal', type: 'tool' },
    { id: 'generate_pdf', name: 'Generator PDF', description: 'Tworzy dokument PDF z tekstu lub HTML.', iconName: 'Pdf', type: 'tool' },
    { id: 'crm_update', name: 'Aktualizacja CRM', description: 'Aktualizuje lub tworzy rekordy w systemie CRM.', iconName: 'Users', type: 'tool' },
    { id: 'auth_oauth', name: 'Uwierzytelnianie OAuth', description: 'Obsługuje proces logowania przez inne serwisy.', iconName: 'Key', type: 'tool' },
];

export const nodesList: Omit<LibraryItem, 'icon'>[] = [
    { id: 'start', name: 'Start', description: 'Początkowy węzeł każdego przepływu pracy.', iconName: 'Start', type: 'node' },
    { id: 'end', name: 'Koniec', description: 'Kończy przepływ pracy i zwraca wynik.', iconName: 'End', type: 'node' },
    { id: 'get_input', name: 'Dane wejściowe', description: 'Definiuje i pobiera dane wejściowe dla przepływu.', iconName: 'Message', type: 'node', inputs: [{ key: 'value', label: 'Dane wejściowe', type: 'textarea', placeholder: 'Wprowadź dane, które rozpoczną przepływ...' }] },
    { id: 'set_variable', name: 'Ustaw zmienną', description: 'Tworzy lub modyfikuje zmienną w przepływie.', iconName: 'Variable', type: 'node', inputs: [{ key: 'name', label: 'Nazwa zmiennej', type: 'text', placeholder: 'np. myVariable' }, { key: 'value', label: 'Wartość zmiennej', type: 'text', placeholder: 'np. "Hello World"' }] },
    { id: 'conditional_if', name: 'Warunek (IF)', description: 'Rozdziela przepływ na podstawie warunku prawda/fałsz.', iconName: 'If', type: 'node' },
    { id: 'conditional_switch', name: 'Przełącznik (Switch)', description: 'Kieruje przepływ do jednej z wielu gałęzi.', iconName: 'GitBranch', type: 'node' },
    { id: 'for_each_loop', name: 'Pętla "Dla każdego"', description: 'Iteruje po liście elementów, wykonując akcje dla każdego.', iconName: 'Repeat', type: 'node' },
    { id: 'loop', name: 'Pętla (Loop)', description: 'Powtarza zestaw akcji określoną liczbę razy.', iconName: 'Loop', type: 'node' },
    { id: 'wait', name: 'Czekaj', description: 'Zatrzymuje przepływ na określony czas.', iconName: 'Wait', type: 'node', inputs: [{ key: 'duration', label: 'Czas oczekiwania (sekundy)', type: 'number', defaultValue: 5, placeholder: '5' }] },
    { id: 'merge', name: 'Połącz', description: 'Łączy wiele gałęzi przepływu w jedną.', iconName: 'Merge', type: 'node' },
    { id: 'split_parallel', name: 'Rozdziel (Równolegle)', description: 'Dzieli pracę na wiele równoległych gałęzi.', iconName: 'Split', type: 'node' },
    { id: 'trigger_schedule', name: 'Harmonogram (CRON)', description: 'Uruchamia przepływ w określonych interwałach czasowych.', iconName: 'Clock', type: 'node' },
    { id: 'trigger_webhook', name: 'Webhook', description: 'Uruchamia przepływ po otrzymaniu żądania HTTP.', iconName: 'Webhook', type: 'node' },
    { id: 'sub_workflow', name: 'Wywołaj pod-schemat', description: 'Uruchamia inny schemat jako część bieżącego.', iconName: 'Function', type: 'node' },
    { id: 'log_message', name: 'Zapisz log', description: 'Zapisuje niestandardową wiadomość w historii wykonań.', iconName: 'Log', type: 'node', inputs: [{ key: 'message', label: 'Wiadomość do zalogowania', type: 'textarea', placeholder: 'Zmienna X ma wartość...' }] },
    { id: 'send_notification', name: 'Wyślij powiadomienie', description: 'Wysyła powiadomienie do użytkownika.', iconName: 'Bell', type: 'node' },
    { id: 'try_catch', name: 'Obsługa błędu', description: 'Przechwytuje błędy w gałęzi "try" i obsługuje je w "catch".', iconName: 'AlertTriangle', type: 'node' },
    { id: 'throw_error', name: 'Rzuć błąd', description: 'Celowo zatrzymuje przepływ z komunikatem błędu.', iconName: 'Error', type: 'node', inputs: [{ key: 'message', label: 'Komunikat błędu', type: 'textarea', placeholder: 'Wystąpił nieoczekiwany błąd.' }] },
    { id: 'filter_data', name: 'Filtruj dane', description: 'Filtruje kolekcję danych na podstawie warunku.', iconName: 'Filter', type: 'node' },
    { id: 'data_mapping', name: 'Mapowanie danych', description: 'Transformuje strukturę danych z jednego formatu na inny.', iconName: 'Brackets', type: 'node' },
];

interface NarzedziaIWezlyProps {
    onNavigate: (page: string) => void;
}

const NarzedziaIWezly: FC<NarzedziaIWezlyProps> = ({ onNavigate }) => {
    const { addItemToSchema } = useSchema();
    const { customItems, addCustomItem, deleteCustomItem } = useCustomeItems();
    const [modalItem, setModalItem] = useState<LibraryItem | null>(null);
    const [modalData, setModalData] = useState<Record<string, any>>({});
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalType, setCreateModalType] = useState<'tool' | 'node' | null>(null);

    const handleOpenCreateModal = (type: 'tool' | 'node') => {
        setCreateModalType(type);
        setIsCreateModalOpen(true);
    };
    
    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        setCreateModalType(null);
    };

    const handleSaveCustomItem = (item: Omit<CustomItem, 'id'>) => {
        addCustomItem(item);
        handleCloseCreateModal();
    };

    const mapItems = (items: (Omit<LibraryItem, 'icon'> | CustomItem)[]): LibraryItem[] => {
        return items.map(item => ({
            ...item,
            icon: Icons.iconMap[item.iconName] || Icons.ToolsIcon
        }));
    };

    const allTools = useMemo(() => {
        const custom = customItems.filter(i => i.type === 'tool');
        return mapItems([...toolsList, ...custom]);
    }, [customItems]);

    const allNodes = useMemo(() => {
        const custom = customItems.filter(i => i.type === 'node');
        return mapItems([...nodesList, ...custom]);
    }, [customItems]);

    const handleAddItemClick = (item: LibraryItem) => {
        if (item.inputs && item.inputs.length > 0) {
            const initialData = item.inputs.reduce((acc, input) => {
                acc[input.key] = input.defaultValue ?? '';
                return acc;
            }, {} as Record<string, any>);
            setModalData(initialData);
            setModalItem(item);
        } else {
            addItemToSchema(item, {});
            onNavigate('Interaktywny schemat');
        }
    }

    const handleModalClose = () => {
        setModalItem(null);
        setModalData({});
    };

    const handleModalSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (modalItem) {
            addItemToSchema(modalItem, modalData);
            onNavigate('Interaktywny schemat');
            handleModalClose();
        }
    };

    const handleModalInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setModalData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const ItemCard: FC<{ item: LibraryItem }> = ({ item }) => (
        <div className={`item-card ${item.isCustom ? 'custom-item' : ''}`}>
             {item.isCustom && (
                <div className="item-card-custom-actions">
                    <button onClick={() => deleteCustomItem(item.id)} aria-label={`Usuń ${item.name}`}>
                        <Icons.DeleteIcon style={{ width: 16, height: 16 }}/>
                    </button>
                </div>
            )}
            <div className="item-card-header">
                <div className={`item-card-icon ${item.type}-icon`}>
                    <item.icon />
                </div>
                <div className="item-card-content">
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                </div>
            </div>
            <div className="item-card-footer">
                <button className="btn btn-save" onClick={() => handleAddItemClick(item)}>
                    <Icons.AddToSchemaIcon /> Dodaj do schematu
                </button>
            </div>
        </div>
    );
    
    const InputModal = () => {
        if (!modalItem) return null;

        return (
            <div className="modal-overlay" onClick={handleModalClose}>
                <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                    <form onSubmit={handleModalSubmit}>
                        <div className="modal-header">
                            <h3>Konfiguruj: {modalItem.name}</h3>
                        </div>
                        <div className="modal-body">
                           {modalItem.inputs?.map(input => (
                               <div className="config-group" key={input.key}>
                                   <label htmlFor={input.key}>{input.label}</label>
                                   {input.type === 'textarea' ? (
                                       <textarea
                                           id={input.key}
                                           name={input.key}
                                           className="styled-textarea"
                                           value={modalData[input.key] || ''}
                                           onChange={handleModalInputChange}
                                           placeholder={input.placeholder}
                                           rows={4}
                                       />
                                   ) : (
                                        <input
                                            id={input.key}
                                            name={input.key}
                                            type={input.type}
                                            className="styled-input"
                                            value={modalData[input.key] || ''}
                                            onChange={handleModalInputChange}
                                            placeholder={input.placeholder}
                                        />
                                   )}
                               </div>
                           ))}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-reset" onClick={handleModalClose}>Anuluj</button>
                            <button type="submit" className="btn btn-save">Dodaj do schematu</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <main className="main-content">
            <InputModal />
            {isCreateModalOpen && createModalType && (
                <CreateItemModal 
                    type={createModalType}
                    onClose={handleCloseCreateModal}
                    onSave={handleSaveCustomItem}
                />
            )}
            <section aria-labelledby="page-title" className="config-page">
                <h2 id="page-title">Narzędzia i Węzły</h2>
                <p>Przeglądaj dostępne komponenty, aby budować swoje schematy pracy agentów, lub stwórz własne.</p>

                <div className="page-actions">
                    <button className="btn btn-save" onClick={() => handleOpenCreateModal('tool')}>
                        <Icons.ToolsIcon /> Stwórz narzędzie
                    </button>
                     <button className="btn btn-save" onClick={() => handleOpenCreateModal('node')}>
                        <Icons.SchemaIcon /> Stwórz węzeł
                    </button>
                </div>

                <div className="tools-nodes-container">
                    <div className="category-column">
                        <h3><Icons.CodeIcon /> Narzędzia</h3>
                        {allTools.map(tool => <ItemCard key={tool.id} item={tool} />)}
                    </div>
                    <div className="category-column">
                        <h3><Icons.SchemaIcon /> Węzły</h3>
                        {allNodes.map(node => <ItemCard key={node.id} item={node} />)}
                    </div>
                </div>
            </section>
        </main>
    );
};

export default NarzedziaIWezly;