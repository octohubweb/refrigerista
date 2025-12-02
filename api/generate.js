// api/generate.js

// Importa a biblioteca do Google Gen AI
import { GoogleGenAI } from '@google/genai';

// A chave API é acessada de forma segura a partir da variável de ambiente que você configurou no Vercel.
const apiKey = process.env.GEMINI_API_KEY;

// Inicializa o cliente com a chave segura
const ai = new GoogleGenAI(apiKey);

// Função principal que o Vercel expõe em /api/generate
export default async function handler(request, response) {
    // Regra de Segurança: Apenas permite requisições POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    try {
        // Tenta ler o corpo JSON da requisição (que contém o 'prompt')
        const { prompt } = await request.json();

        if (!prompt) {
            return response.status(400).json({ error: 'Prompt ausente na requisição.' });
        }
        
        // Faz a chamada segura para a API do Gemini
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const generatedText = result.candidates[0].content.parts[0].text;

        // Envia a resposta de volta para o PWA
        return response.status(200).json({ message: generatedText });

    } catch (error) {
        console.error("Erro ao chamar a API do Gemini:", error);
        // Em caso de falha, retorne um erro genérico e seguro
        return response.status(500).json({ error: "Erro interno no servidor. Verifique a chave API (GEMINI_API_KEY) no Vercel." });
    }
}