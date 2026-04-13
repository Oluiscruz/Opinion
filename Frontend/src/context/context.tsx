{/*
    Criando context para guardar dados dos usuários logados e compartilhar
    entre os componentes e diferentes grafos da arvore do react.
*/}

import { createContext, useEffect, useState, useContext } from "react";
import type { ReactNode } from "react";

// Definindo a estrutura do contexto
interface AuthContextData {
    user: { name: string, nickname: string, email: string, plan_type: string } | null;
    token: string | null;
    signed: boolean;
    Login(credentials: { email: string; password: string }): Promise<void>;
    Logout(): void;
}

// Tipagem explícita do contexto
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {

    const [user, setUser] = useState<{
        name: string,
        nickname: string,
        email: string,
        plan_type: string
    } | null>(null);

    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("@App:user");
        const storedToken = localStorage.getItem("@App:token");

        if (storedUser && storedToken) {
            try {
                const parsedUser = JSON.parse(storedUser) as {
                    name: string;
                    nickname: string;
                    email: string;
                    plan_type: string;
                };
                setUser(parsedUser);
                setToken(storedToken);
            } catch {
                localStorage.removeItem("@App:user");
                localStorage.removeItem("@App:token");
            }
        }
    }, []);

    async function Login(credentials: { email: string; password: string }) {
        const apiBaseUrl = import.meta.env.API_URL || 'http://localhost:8000';
        const body = new URLSearchParams({
            username: credentials.email,
            password: credentials.password,
        });

        const response = await fetch(`${apiBaseUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });

        if (!response.ok) {
            let message = "Login failed.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.detail === "string") {
                    message = errorData.detail;
                }
            } catch {
                // Mantém a mensagem padrão se a resposta não for JSON
            }
            throw new Error(message);
        }

        const data: { access_token?: string } = await response.json();
        if (!data.access_token) {
            throw new Error("Token inválido recebido no login.");
        }

        const meResponse = await fetch(`${apiBaseUrl}/auth/me`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${data.access_token}`,
            },
        });

        if (!meResponse.ok) {
            throw new Error("Não foi possível carregar os dados do usuário.");
        }

        const loggedUser: { name: string; nickname: string; email: string; plan_type: string } =
            await meResponse.json();

        setUser(loggedUser);
        setToken(data.access_token);
        localStorage.setItem("@App:user", JSON.stringify(loggedUser));
        localStorage.setItem("@App:token", data.access_token);
    }
        
        function Logout() {
            setUser(null);
            setToken(null);
            localStorage.removeItem('@App:user');
            localStorage.removeItem('@App:token');
        }

        const data: AuthContextData = {
            user,
            token,
            signed: !!token, // booleano derivado da presença do token
            Login,
            Logout,
        };

        return (
            <AuthContext.Provider value={data}>
                {children}
            </AuthContext.Provider>
        );
}

export function UseAuth() {
    const context = useContext(AuthContext);
        if (!context) {
            throw new Error("UseAuth deve ser usado dentro de um AuthProvider");
        }
        return context;
}
