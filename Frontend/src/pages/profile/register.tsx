import { Link, useNavigate } from "react-router";
import Bottom from "../home/bottom";
import { useState } from "react";
import { UseAuth } from "../../context/context";
import { getApiBaseUrl } from "../../services/apiBase";
import { AtSign, CircleUserRound, LockKeyhole, Mail } from "lucide-react";
import '../../styles/profile/account.scss';

export default function Register() {

    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPwd] = useState('');
    const [loading, setLoading] = useState(false);
    const [msgError, setMsgError] = useState('');
    const [msgSuccess, setMsgSuccess] = useState('')

    const navigate = useNavigate();
    const { Login } = UseAuth();

    async function RegisterUser(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true);

        const UserData = { nickname, name, email, password };
        const apiBaseUrl = getApiBaseUrl();

        try {
            const response = await fetch(`${apiBaseUrl}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(UserData),
            });

            if (!response.ok) {
                let message = "Error registering user";
                try {
                    const errorData = await response.json();
                    if (typeof errorData?.detail === "string") {
                        message = errorData.detail;
                    }
                } catch {
                    // Mantém mensagem padrão
                }
                throw new Error(message);
            }

            console.log("Register saved with success.");
            setMsgSuccess('User registered successfully!');
            setTimeout(() => setMsgSuccess(''), 3000); // Apaga a mensagem de sucesso após 5 segundos

            await Login({ email, password });
            navigate("/profile");

        } catch (error) {
            console.error("Error registering user:", error);
            const message = error instanceof Error ? error.message : 'Error registering user';
            setMsgError(message);
            setTimeout(() => setMsgError(''), 3000); // Apaga a mensagem de erro após 3 segundos

        } finally { setLoading(false); }
    }


    return (
        <div className="container">
            {msgError &&
                <div className="modal-overlay" onClick={() => setMsgError('')}>
                    <div className="content-modal-error" onClick={(e) => e.stopPropagation()}>
                        <p className="error">{msgError}</p>
                    </div>
                </div>}
            {msgSuccess &&
                <div className="modal-overlay" onClick={() => setMsgSuccess('')}>
                    <div className="content-modal-success" onClick={(e) => e.stopPropagation()}>
                        <p className="success">{msgSuccess}</p>
                    </div>
                </div>}

            <div className="content-account">
                <div className="title">
                    <h1>Register</h1>
                </div>

                <form onSubmit={RegisterUser}>
                    <div className="input-group">
                        <CircleUserRound size={18} aria-hidden={true} />
                        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <AtSign size={18} aria-hidden={true} />
                        <input type="text" placeholder="Username" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <Mail size={18} aria-hidden={true} />
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <LockKeyhole size={18} aria-hidden={true} />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPwd(e.target.value)} />
                    </div>
                    <button type="submit" disabled={loading}>
                        {loading ? 'Registering...' : 'Register'}
                    </button>

                    <span><Link to="/login">Already have an account? Login</Link></span>
                </form>
            </div>
            <Bottom />
        </div>
    );
}
