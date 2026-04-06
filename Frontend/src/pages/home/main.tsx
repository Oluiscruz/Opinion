import { ScanSearch } from 'lucide-react';
import '../../styles/home/main.scss';

export default function Main() {
    

    return (
        <div className="content-main">
            <div className="title-main">
            <h1>OPINION <span>Opi</span></h1>
            
            </div>

            <div className="content-main-search">
                <div className="search-input-wrapper">
                    <ScanSearch className="search-icon" size={18} aria-hidden={true} />
                    <input type="text" name="search" placeholder="Search any topic..." />
                </div>
                <div className="btn-search">
                    <button>Research</button>
                </div>
            </div>

            <div className="content-main-info">
                <p>Search for any topic and Opi will find out what people are feeling on social media about it.</p>
            </div>
        </div>
    )
}