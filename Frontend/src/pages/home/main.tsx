import { Search, Sparkle, Sparkles } from "lucide-react";
import { useState } from "react";
import "../../styles/home/main.scss";
import logo from "../../assets/images/Logo00.svg";

export default function Main() {
    const [loading, setLoading] = useState(false);
    const [msgError, setMsgError] = useState("");
    const [msgSuccess, setMsgSuccess] = useState("");

    const handleSearch = () => {
        setLoading(true);
        setMsgError("");
        setMsgSuccess("");

        try {
            // Simulação de uma pesquisa assíncrona
            setTimeout(() => {
                setLoading(false);
                setMsgSuccess("Search completed successfully!");
            }, 2000);
        } catch (error) {
            setLoading(false);
            const message =
                error instanceof Error
                    ? error.message
                    : "An unexpected error occurred.";
            setMsgError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            {msgError && (
                <div className={"modal-overlay"}>
                    <div
                        className="content-modal-error"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="error">{msgError}</p>
                    </div>
                </div>
            )}
            {msgSuccess && (
                <div className="modal-overlay" onClick={() => setMsgSuccess("")}>
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
                            <Search className="search-icon"
                                size={18}
                                aria-hidden={true} />


                            <input
                                type="text"
                                name="search"
                                placeholder="Pesquisar tema, pessoa, marca..."
                            />
                        </div>
                        <div className="btn-search">
                            <button disabled={loading} onClick={handleSearch}>
                                {loading ? (
                                    <span className="spinner" aria-hidden={true}></span>
                                ) : (
                                    ""
                                )}
                                <Sparkle size={18} />Analisar
                            </button>
                        </div>
                    </div>
                    <div className="topics-of-search">
                        <div className="title-topics">
                            <p>Tópicos rápidos:</p>

                        </div>
                        <li><button>Datacenters no Brasil</button></li>
                        <li><button>Israel vs Palestina</button></li>
                        <li><button>Socialismo ou Capitalismo</button></li>
                    </div>
                </div>

                <div className="content-main-info">
                    <p>
                        Pesquise qualquer tópico e o Opy coletará comentários nas redes sociais 
                        e retornará o sentimento geral das pessoas sobre o tema.
                    </p>
                </div>
            </div>
        </div>
    );
}
