import { Link, useNavigate } from "react-router";
import Bottom from "../home/bottom";
import { LockKeyhole, Mail } from "lucide-react";
import { UseAuth } from "../../context/context";
import { useState } from "react";

export default function Login() {

    const [email, setEmail] = useState('');
    const [password, setPwd] = useState('');
    const [loading, setLoading] = useState(false);
    const [msgError, setMsgError] = useState('');
    const [msgSuccess, setMsgSuccess] = useState('')

    const navigate = useNavigate();
        const { Login } = UseAuth();
    
        async function doLogin(e: React.FormEvent) {
            e.preventDefault();
            setLoading(true);
    
            const UserData = { email, password };
    
            try {
                await Login(UserData);
                console.log("Login saved with success.");
                setMsgSuccess('User logged in successfully!');
                setTimeout(() => setMsgSuccess(''), 3000); // Apaga a mensagem de sucesso após 5 segundos
                navigate("/profile");
    
            } catch (error) {
                console.error("Error to do login:", error);
                const message = error instanceof Error ? error.message : 'error to do login';
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
            <h1>Login</h1>
            </div>

            <form onSubmit={doLogin}>
                <div className="input-group">
                    <Mail size={18} aria-hidden={true} />
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="input-group">
                    <LockKeyhole size={18} aria-hidden={true} />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPwd(e.target.value)} />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>

                <span><Link to="/register">Already have an account? Register</Link></span>
            </form>
        </div>

                <Bottom />
        </div>
    );
}
