
{/* 
    Polling é uma técnica onde o cliente fica perguntando ao servidor repetidamente:
    "já terminou?", até receber a resposta que quer. 
    Como a análise acontece em background o polling serve para 
    essa parte do frontend verificar até os dados estarem completos 
    */}

import { useRef } from "react";

export interface SentimentData {
    term: string;
    totalAnalyzed: number;
    positive: number;
    neutral: number;
    negative: number;
    keywords: string[];
}

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

function processResults(data: { sentiment: string; reason: string }[], term: string): SentimentData {
    const total = data.length;
    const positive = data.filter(c => c.sentiment === "positivo").length;
    const neutral = data.filter(c => c.sentiment === "neutro").length;
    const negative = data.filter(c => c.sentiment === "negativo").length;

    const wordFreq: Record<string, number> = {};
    data.forEach(c => {
        c.reason?.toLowerCase().split(/\s+/).forEach(w => {
            if (w.length > 4) wordFreq[w] = (wordFreq[w] ?? 0) + 1;
        });
    });
    const keywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([w]) => w);

    return {
        term,
        totalAnalyzed: total,
        positive: total ? Math.round((positive / total) * 100) : 0,
        neutral: total ? Math.round((neutral / total) * 100) : 0,
        negative: total ? Math.round((negative / total) * 100) : 0,
        keywords,
    };
}

interface UsePollingCallbacks {
    onCompleted: (data: SentimentData) => void;
    onError?: () => void;
}

export function usePolling({ onCompleted, onError }: UsePollingCallbacks) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stop = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const start = (searchId: string, term: string) => {
        stop();
        intervalRef.current = setInterval(async () => {
            try {
                const statusRes = await fetch(`${apiBaseUrl}/analysis/status/${searchId}`);
                const statusData = await statusRes.json();

                if (statusData.status === "completed" && statusData.video_id) {
                    stop();
                    const resultsRes = await fetch(`${apiBaseUrl}/analysis/results/${statusData.video_id}`);
                    const resultsData = await resultsRes.json();
                    onCompleted(processResults(resultsData.data ?? [], term));
                }
            } catch {
                stop();
                onError?.();
            }
        }, 5000);
    };

    return { start, stop };
}
