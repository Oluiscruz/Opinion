import Bottom from "../home/bottom";
import { UseAuth } from "../../context/context";

import { useNavigate } from "react-router";
import { span } from "motion/react-client";


export default function User() {

    const navigate  = useNavigate();
    const { user, Logout } = UseAuth();

    const LogoutUser = () => {
        Logout();
        navigate("/login");
    }

    return (
        <div className="container">

        <div className="content-user">
            <h1>User</h1>

            {user ? (
                <div className="user-info">
                    <p>Name: {user.name}</p>
                    <p>Nickname: {user.nickname}</p>
                    <p>Email: {user.email}</p>
                    <p>Plan Type: {user.plan_type}</p>
                    <button onClick={LogoutUser}>Logout</button>
                </div>
            ) : (
                <span className="spinner">loading...</span>
            ) }

        </div>
        
        <Bottom />
        </div>
    );
}