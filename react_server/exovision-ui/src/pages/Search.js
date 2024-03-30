import React, { useState, useEffect } from "react";

const Search = () => {
    const [searchTerm, setSearchTerm] = useState("");
    return (
        <div className="app-container">
            <div className="search-bar-page">
                <input
                    type="text"
                    placeholder="Search for a star"
                    className="search-page"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
    );
};

export default Search;
