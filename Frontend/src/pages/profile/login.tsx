import { Link, useNavigate } from "react-router";
import Bottom from "../home/bottom";
import { UseAuth } from "../../context/context";
import { LockKeyhole, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import '../../styles/profile/account.scss';

export default function Login() {

    const [email, setEmail] = useState('');
    const [password, setPwd] = useState('');
    const [loading, setLoading] = useState(false);
    const [msgError, setMsgError] = useState('');
    const [msgSuccess, setMsgSuccess] = useState('');
    const [isErrorClosing, setIsErrorClosing] = useState(false);

    const navigate = useNavigate();
    const errorAutoCloseTimeoutRef = useRef<number | null>(null);
    const errorUnmountTimeoutRef = useRef<number | null>(null);
    const errorAnimationDuration = 240;

    useEffect(() => {
        return () => {
            if (errorAutoCloseTimeoutRef.current) {
                window.clearTimeout(errorAutoCloseTimeoutRef.current);
            }

            if (errorUnmountTimeoutRef.current) {
                window.clearTimeout(errorUnmountTimeoutRef.current);
            }
        };
    }, []);

    interface User {
        email: string;
        password: string;
    }

    const clearErrorTimers = () => {
        if (errorAutoCloseTimeoutRef.current) {
            window.clearTimeout(errorAutoCloseTimeoutRef.current);
            errorAutoCloseTimeoutRef.current = null;
        }

        if (errorUnmountTimeoutRef.current) {
            window.clearTimeout(errorUnmountTimeoutRef.current);
            errorUnmountTimeoutRef.current = null;
        }
    };

    const closeErrorModal = () => {
        clearErrorTimers();
        setIsErrorClosing(true);

        errorUnmountTimeoutRef.current = window.setTimeout(() => {
            setMsgError('');
            setIsErrorClosing(false);
            errorUnmountTimeoutRef.current = null;
        }, errorAnimationDuration);
    };

    const showErrorModal = (message: string) => {
        clearErrorTimers();
        setMsgError(message);
        setIsErrorClosing(false);

        errorAutoCloseTimeoutRef.current = window.setTimeout(() => {
            closeErrorModal();
        }, 4000);
    };

    const { Login } = UseAuth();

    const doLogin = async (User: User) => {
        setLoading(true);

        try {
            await Login(User);
            setMsgSuccess('User logged in successfully!');
            navigate('/profile');
        } catch (error) {
            console.error('Error to do login:', error);
            const message = error instanceof Error ? error.message : 'error to do login';
            showErrorModal(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            {msgError &&
                <div className={`modal-overlay${isErrorClosing ? ' is-closing' : ''}`} onClick={closeErrorModal}>
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

            <form onSubmit={(e) => {
                e.preventDefault();
                doLogin({ email, password});
            }}>
                <div className="input-group">
                    <Mail size={18} aria-hidden={true} />
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="input-group">
                    <LockKeyhole size={18} aria-hidden={true} />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPwd(e.target.value)} />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? <span className="spinner" aria-hidden={true}></span> : 'Login'}
                </button>

                <span><Link to="/register">Already have an account? Register</Link></span>
            </form>
        </div>

                <Bottom />
        </div>
    );
}
