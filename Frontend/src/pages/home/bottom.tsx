import { Search, User, History, House } from "lucide-react";
import { NavLink } from "react-router-dom";
import "../../styles/home/bottom.scss";
import { UseAuth } from "../../context/context";

export default function Bottom() {
    const {user} = UseAuth();
    
    return (
        <div className="content-menu">
            <div className="menu-item">

                {user ? (
                    <>
                    <li>
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => (isActive ? "active" : "")}
                    >
                        <House />
                    </NavLink>
                    <div className="bar"></div>
                </li>
                <li>
                    <NavLink
                        to="/search"
                        className={({ isActive }) => (isActive ? "active" : "")}
                    >
                        <Search />
                    </NavLink>
                    <div className="bar"></div>
                </li>
                    <li>
                        <NavLink
                            to="/profile"
                            className={({ isActive }) => (isActive ? "active" : "")}
                        >
                            <User />
                        </NavLink>
                        <div className="bar"></div>
                    </li>
                    <li>
                    <NavLink
                        to="/history"
                        className={({ isActive }) => (isActive ? "active" : "")}
                    >
                        <History />
                    </NavLink>
                    <div className="bar"></div>

                </li>
                        </>
                )  : (
                    <> 
                    <li>
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => (isActive ? "active" : "")}
                    >
                        <House />
                    </NavLink>
                    <div className="bar"></div>
                </li>
                <li>
                    <NavLink
                        to="/search"
                        className={({ isActive }) => (isActive ? "active" : "")}
                    >
                        <Search />
                    </NavLink>
                    <div className="bar"></div>
                </li>
                <li>
                    <NavLink
                        to="/login"
                        className={({ isActive }) => (isActive ? "active" : "")}
                    >
                        <User />
                    </NavLink>
                    <div className="bar"></div>

                </li>
                <li>
                    <NavLink
                        to="/history"
                        className={({ isActive }) => (isActive ? "active" : "")}
                    >
                        <History />
                    </NavLink>
                    <div className="bar"></div>

                </li>
                </>
                ) }
            </div>
        </div>
    );
}
