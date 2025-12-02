// api/generate.js

// Importe a biblioteca do Google Gen AI (Instale via npm se necessário no deploy)
import { GoogleGenAI } from '@google/genai';

// O Vercel injeta a chave API de forma segura aqui.
// Acesso usando process.env.NOME_DA_VARIAVEL_AQUI
const apiKey = process.env.GEMINI_API_KEY;

// Inicializa o cliente com a chave segura
const ai = new GoogleGenAI(apiKey);

// Esta é a função principal que o Vercel executará
export default async function handler(request, response) {
    // 1. Regra de Segurança: Apenas permite POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    // 2. Tenta ler o prompt enviado pelo seu PWA
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return response.status(400).json({ error: 'Prompt ausente na requisição.' });
        }

        // 3. Faz a chamada segura para a API do Gemini
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Modelo leve e rápido
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const generatedText = result.candidates[0].content.parts[0].text;

        // 4. Envia a resposta de volta para o PWA
        return response.status(200).json({ message: generatedText });

    } catch (error) {
        console.error("Erro ao chamar a API do Gemini:", error);
        // Retorna um erro genérico de segurança para o cliente
        return response.status(500).json({ error: "Erro interno ao gerar a mensagem. Verifique a chave API no Vercel." });
    }
}