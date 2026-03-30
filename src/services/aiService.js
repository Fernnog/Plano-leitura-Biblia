import { CONFIG } from '../config/app-config.js'; // Ajuste conforme seu config

class GeminiService {
    constructor() {
        this.config = {
            model: 'gemini-1.5-flash-latest', // Nome atualizado do modelo
            storageKeyApi: 'biblia_plan_gemini_key'
        };
    }

    getApiKey() {
        let key = localStorage.getItem(this.config.storageKeyApi);
        if (!key) {
            key = prompt("🔑 Para usar a Análise Exegética, insira sua API Key do Google Gemini:");
            if (key && key.startsWith('AIza')) {
                localStorage.setItem(this.config.storageKeyApi, key.trim());
            } else if (key) {
                alert("Chave inválida. Deve começar com AIza.");
                return null;
            }
        }
        return key;
    }

    async analyzeChapterWithStrongs(chapterName) {
        // Adaptamos seu prompt para uma execução "Zero-Shot" (pergunta e resposta direta)
        const prompt = `Atue como um especialista em linguística bíblica. Extraia as palavras-chave teologicamente mais ricas do capítulo: "${chapterName}".
        
        Regras Estritas:
        - Selecione entre 3 e 10 palavras fundamentais.
        - Não adicione introduções ou conclusões.
        - Formato obrigatório para cada palavra:
        * [Palavra em Português] (v. [Versículo]) -> Strong [H ou G][Número] | [Termo Original Transliterado] | [Significado direto, resumido e foco etimológico].`;

        const apiKey = this.getApiKey();
        if (!apiKey) throw new Error("API Key não fornecida.");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        if (data.error) {
            if (data.error.code === 400 || data.error.code === 403) localStorage.removeItem(this.config.storageKeyApi);
            throw new Error(data.error.message);
        }
        return data.candidates[0].content.parts[0].text.trim();
    }
}
export const aiService = new GeminiService();
