import { Cell, Legend, ResponsiveContainer, Tooltip, Pie, PieChart } from "recharts";
import "../../styles/home/charts.scss";

interface SentimentData {
    term: string;
    totalAnalyzed: number;
    positive: number;
    neutral: number;
    negative: number;
    keywords: string[];
}

interface ChartsProps {
    results: SentimentData;
}

const COLORS = ["#34d399", "#fbbf24", "#f87171"];

export default function Charts({ results }: ChartsProps) {
    const chartData = [
        { name: "Positivo", value: results.positive },
        { name: "Neutro", value: results.neutral },
        { name: "Negativo", value: results.negative }
    ];

    return (
        <div className="charts-container">
            <div className="dashboard-header">
                <div className="box-header">
                    <p>Sentimento Geral</p>
                    <span>{results.positive.toLocaleString()}%</span>
                </div>
                <div className="box-header">
                    <p>Comentários</p>
                    <span>{results.totalAnalyzed.toLocaleString()}</span>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <h3>Sentimento Geral</h3>
                    <div className="chart">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    labelLine={true}
                                    dataKey="value"
                                >
                                    {chartData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card keywords-card">
                    <h3>Palavras-chave</h3>
                    <div className="keywords-list">
                        {results.keywords.map((keyword, index) => (
                            <span key={index} className="keyword">{keyword}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
