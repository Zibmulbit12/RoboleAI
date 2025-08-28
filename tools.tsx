import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";

// Helper to get API key. It's better to have this defined once.
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

export interface Tool {
    displayName: string;
    description: string;
    functionDeclaration: FunctionDeclaration;
    execute: (args: any) => Promise<any>; // Return any to support rich data like objects
}

export const tools: Record<string, Tool> = {
    'calculator': {
        displayName: 'Kalkulator',
        description: 'Oblicza wynik wyrażenia matematycznego.',
        functionDeclaration: {
            name: 'calculator',
            description: 'Oblicza wynik wyrażenia matematycznego.',
            parameters: { type: Type.OBJECT, properties: { expression: { type: Type.STRING, description: 'Wyrażenie matematyczne do obliczenia, np. "2 * (3 + 4)"' } }, required: ['expression'] }
        },
        execute: async ({ expression }: { expression: string }) => {
            try {
                // Simple regex to allow only safe characters
                if (!/^[0-9+\-*/.()\s]+$/.test(expression)) {
                    throw new Error("Niedozwolone znaki w wyrażeniu.");
                }
                // Use Function constructor for safer evaluation than eval()
                const result = new Function(`return ${expression}`)();
                return `Wynik: ${result}`;
            } catch (error) {
                return `Błąd obliczeń: ${(error as Error).message}`;
            }
        },
    },
    'notes': {
        displayName: 'Notatki i przypomnienia',
        description: 'Zarządza prostą listą notatek. Użyj "add: treść notatki", aby dodać, lub "list", aby wyświetlić.',
        functionDeclaration: {
            name: 'notes',
            description: 'Zarządza notatkami. Dostępne komendy: "add: [treść]", "list".',
            parameters: { type: Type.OBJECT, properties: { command: { type: Type.STRING, description: 'Komenda do wykonania, np. "add: Kup mleko" lub "list"' } }, required: ['command'] }
        },
        execute: async ({ command }: { command: string }) => {
            try {
                const notes: string[] = JSON.parse(localStorage.getItem('agent_notes') || '[]');
                if (command.toLowerCase().startsWith('add:')) {
                    const note = command.substring(4).trim();
                    if (note) {
                        notes.push(note);
                        localStorage.setItem('agent_notes', JSON.stringify(notes));
                        return `Notatka dodana: "${note}"`;
                    }
                    return 'Notatka nie może być pusta.';
                } else if (command.toLowerCase() === 'list') {
                    if (notes.length === 0) return 'Brak notatek.';
                    return `Twoje notatki:\n- ${notes.join('\n- ')}`;
                }
                return 'Nieznana komenda. Użyj "add: [treść]" lub "list".';
            } catch (error) {
                return `Wystąpił błąd w obsłudze notatek: ${(error as Error).message}`;
            }
        },
    },
     'code_interpreter': {
        displayName: 'Interpreter kodu',
        description: 'Bezpiecznie interpretuje kod JavaScript używając AI i zwraca jego wynik.',
        functionDeclaration: {
            name: 'code_interpreter',
            description: 'Interpretuje fragment kodu JavaScript i zwraca jego wynik tekstowy.',
            parameters: { type: Type.OBJECT, properties: { code: { type: Type.STRING, description: 'Kod JavaScript do zinterpretowania' } }, required: ['code'] }
        },
        execute: async ({ code }: { code: string }) => {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Zinterpretuj poniższy kod JavaScript i zwróć jego wynik jako tekst. Jeśli kod jest niebezpieczny lub zawiera błędy, zwróć opis problemu. Kod:\n\n\`\`\`javascript\n${code}\n\`\`\``,
            });
            return response.text;
        },
    },
    'translate_text': {
        displayName: 'Tłumacz tekst',
        description: 'Tłumaczy tekst na podany język.',
        functionDeclaration: {
            name: 'translate_text',
            description: 'Tłumaczy tekst na podany język docelowy.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: 'Tekst do przetłumaczenia' },
                    targetLanguage: { type: Type.STRING, description: 'Język docelowy (np. "polski", "angielski")' }
                },
                required: ['text', 'targetLanguage']
            }
        },
        execute: async ({ text, targetLanguage }: { text: string, targetLanguage: string }) => {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Przetłumacz poniższy tekst na język ${targetLanguage}:\n\n---\n${text}\n---`,
            });
            return response.text;
        },
    },
    'text_summarize': {
        displayName: 'Streszczenie tekstu',
        description: 'Skraca długi tekst do kluczowych punktów.',
        functionDeclaration: {
            name: 'text_summarize',
            description: 'Tworzy zwięzłe streszczenie podanego tekstu.',
            parameters: { type: Type.OBJECT, properties: { text: { type: Type.STRING, description: 'Tekst do streszczenia' } }, required: ['text'] }
        },
        execute: async ({ text }: { text: string }) => {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Streść poniższy tekst w kilku kluczowych punktach:\n\n---\n${text}\n---`,
            });
            const summary = response.text;
            
            // Return as a downloadable file object
            return {
                __rich_data_type__: 'file',
                filename: `podsumowanie-${new Date().getTime()}.txt`,
                mimeType: 'text/plain',
                // btoa is a browser function to encode to base64
                content: btoa(unescape(encodeURIComponent(summary)))
            };
        },
    },
    'sentiment_analysis': {
        displayName: 'Analiza sentymentu',
        description: 'Określa nacechowanie emocjonalne tekstu.',
        functionDeclaration: {
            name: 'sentiment_analysis',
            description: 'Analizuje sentyment (wydźwięk emocjonalny) podanego tekstu. Odpowiada jednym słowem: Pozytywny, Negatywny lub Neutralny.',
            parameters: { type: Type.OBJECT, properties: { text: { type: Type.STRING, description: 'Tekst do analizy' } }, required: ['text'] }
        },
        execute: async ({ text }: { text: string }) => {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Przeanalizuj sentyment poniższego tekstu. Odpowiedz jednym słowem: Pozytywny, Negatywny lub Neutralny.\n\n---\n${text}\n---`,
            });
            return response.text.trim();
        },
    },
    'generate_image': {
        displayName: 'Generator obrazów',
        description: 'Generuje obraz na podstawie opisu tekstowego.',
        functionDeclaration: {
            name: 'generate_image',
            description: 'Generuje obraz na podstawie opisu tekstowego.',
            parameters: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING, description: 'Opis obrazu do wygenerowania' } }, required: ['prompt'] }
        },
        execute: async ({ prompt }: { prompt: string }) => {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                },
            });
            
            if (!response.generatedImages || response.generatedImages.length === 0) {
                 throw new Error("Nie udało się wygenerować obrazu.");
            }
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return {
                __rich_data_type__: 'image',
                base64: base64ImageBytes,
                alt: `Wygenerowany obraz dla promptu: "${prompt}"`
            };
        },
    },
};