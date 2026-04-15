import { Search, Sparkle, Sparkles } from "lucide-react";
import { useState } from "react";
import { UseAuth } from "../../context/context";
import "../../styles/home/main.scss";
import logo from "../../assets/images/Logo00.svg";
import Charts from "./charts";
import { usePolling, type SentimentData } from "./polling";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Main() {
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [msgError, setMsgError] = useState("");
    const [msgSuccess, setMsgSuccess] = useState("");
    const [results, setResults] = useState<SentimentData | null>(null);
    const { token } = UseAuth();

    const { start: startPolling, stop: stopPolling } = usePolling({
        onCompleted: (data) => {
            setResults(data);
            setMsgSuccess("");
            setLoading(false);
        },
        onError: () => {
            setMsgError("Erro ao verificar o status da análise. Tente novamente.");
            setLoading(false);
        },
    });

    const handleSearch = async (termToSearch: string) => {
        if (!termToSearch.trim()) {
            setMsgError("Please enter a search term.");
            return;
        }
        if (!token) {
            setMsgError("Você precisa estar logado para realizar uma análise.");
            return;
        }
        stopPolling();
        setLoading(true);
        setMsgError("");
        setMsgSuccess("");
        setResults(null);

        try {
            const url = `${apiBaseUrl}/api/analyze?theme=${encodeURIComponent(termToSearch)}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                setMsgError("Unauthorized. Please log in to perform analysis.");
                setLoading(false);
                return;
            }

            if (res.status === 429) {
                const body = await res.json().catch(() => null);
                setMsgError(body?.detail || "Rate limit reached. Please try later or upgrade your plan.");
                setLoading(false);
                return;
            }

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setMsgError(body?.detail || "An error occurred while starting the analysis.");
                setLoading(false);
                return;
            }

            const data = await res.json();
            setMsgSuccess(data?.message || `Analysis started for "${termToSearch}".`);
            startPolling(data.search_id, termToSearch);
        } catch (error) {
            setMsgError(error instanceof Error ? error.message : "An error occurred during analysis.");
            setLoading(false);
        }
    };

    return (
        <div className="container">
            {msgError && (
                <div className={"modal-overlay"} onClick={() => setMsgError("")}>
                    <div
                        className="content-modal-error"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="error">{msgError}</p>
                    </div>
                </div>
            )}
            {msgSuccess && (
                <div className={"modal-overlay"} onClick={() => setMsgSuccess("")}>
                    <div
                        className="content-modal-success"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="success">{msgSuccess}</p>
                    </div>
                </div>
            )}

            <div className="content-main">
                <div className="title-main">
                    <h1>
                        OPYNION <span>Opy</span>
                    </h1>
                    <img src={logo} alt="Logo" width={170} />
                </div>

                <div className="content-main-analysis">
                    <div className="title-topic">
                        <span>
                            <Sparkles size={18} />
                            <p>Análise de sentimento em tempo real</p>
                        </span>
                    </div>
                    <div className="title-analysis">
                        <h1>
                            O que as pessoas estão <br />
                            <span>falando sobre?</span>
                        </h1>
                    </div>
                    <div className="search-analysis">
                        <div className="search-input-wrapper">
                            <Search className="search-icon" size={18} aria-hidden={true} />

                            <input
                                type="text"
                                name="search"
                                placeholder="Pesquisar tema, pessoa, marca..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch(searchTerm)}
                            />
                        </div>
                        <div className="btn-search">
                            <button
                                disabled={loading}
                                onClick={() => handleSearch(searchTerm)}
                            >
                                {loading ? (
                                    <span className="spinner" aria-hidden={true}></span>
                                ) : (
                                    <Sparkle size={18} />
                                )}
                                {loading ? "Analisando..." : "Analisar"}
                            </button>
                        </div>
                    </div>
                    <div className="topics-of-search">
                        <div className="title-topics">
                            <p>Tópicos rápidos:</p>
                        </div>
                        <ul>
                            <li>
                                <button
                                    onClick={() => {
                                        (setSearchTerm("Datacenters no Brasil"),
                                            handleSearch("Datacenters no Brasil"));
                                    }}
                                >
                                    Datacenters no Brasil
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => {
                                        (setSearchTerm("Israel vs Palestina"),
                                            handleSearch("Israel vs Palestina"));
                                    }}
                                >
                                    Israel vs Palestina
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => {
                                        (setSearchTerm("Socialismo ou Capitalismo"),
                                            handleSearch("Socialismo ou Capitalismo"));
                                    }}
                                >
                                    Socialismo ou Capitalismo
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="content-main-info">
                    <p>
                        Pesquise qualquer tópico e o Opy coletará comentários nas redes
                        sociais e retornará o sentimento geral das pessoas sobre o tema.
                    </p>
                </div>
            </div>

            {/* --- RENDERIZAÇÃO CONDICIONAL DOS RESULTADOS AQUI --- */}
            {results && <Charts results={results} />}
        </div>
    );
}
