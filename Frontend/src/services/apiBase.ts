const envBase = (import.meta.env.VITE_API_URL ?? "").trim();

function stripTrailingSlash(value: string) {
    return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
    if (envBase) {
        return stripTrailingSlash(envBase);
    }

    if (import.meta.env.DEV && typeof window !== "undefined") {
        return window.location.origin;
    }

    if (typeof window !== "undefined") {
        const { protocol, hostname } = window.location;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return `${protocol}//${hostname}:8000`;
        }
        return `${protocol}//${hostname}`;
    }

    return "http://localhost:8000";
}
