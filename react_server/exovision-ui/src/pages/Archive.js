import React, { useState, useEffect } from "react";
import "./pages.css";
import { useNavigate } from "react-router-dom";

function Archive() {
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState(""); 
    const navigate = useNavigate();

    useEffect(() => {
        fetch("/api/archive")
            .then((res) => res.json())
            .then((data) => {
                setData(data);
            });
    }, []);

    const filteredData = data.filter((item) => {
        const matchesSearchTerm = item.tid.toString().toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === "" || parseInt(filter) === item.confirmed_planet;
        return matchesSearchTerm && matchesFilter;
    });

    return (
        <div className="app-container">
            <div className="search-and-filter-bar"> 
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search by TID..."
                        className="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-dropdown">
                    <select className="filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="">All</option>
                        <option value="1">Exoplanet Candidate</option>
                        <option value="0">Non-Candidate</option>
                    </select>
                </div>
            </div>
            {filteredData.length > 0 ? (
                filteredData.map((item) => (
                    <div className="archive-container" key={item.tid} onClick={() => navigate(`/analyze/${item.tid}`)}>
                        {item.confirmed_planet === 1 ? (
                            <div className="archive-container-exo">
                                <p className="archive-text">{item.tid}</p>
                                <p className="archive-text-exo">Exoplanet Candidate</p>
                            </div>
                        ) : (
                            <p className="archive-text">{item.tid}</p>
                        )}
                    </div>
                ))
            ) : (
                <p>No results found.</p>
            )}
        </div>
    );
}

export default Archive;
