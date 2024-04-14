import React, { useState, useEffect } from "react";
import "./pages.css";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";

function Archive() {
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("");
    const navigate = useNavigate();

    const [hover2, setHover2] = useState(false);
    const [modalIsOpen, setIsOpen] = React.useState(false);

    function openModal() {
        setIsOpen(true);
    }

    function afterOpenModal() {
        // references are now sync'd and can be accessed.
    }

    function closeModal() {
        setIsOpen(false);
    }

    Modal.setAppElement("#root");

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
            <button
                style={{
                    height: "8vh",
                    width: "8vh",
                    backgroundColor: "#000000",
                    marginTop: "90.5vh",
                    marginLeft: "74.6vw",
                    position: "fixed",
                    display: "flex",
                    justifyContent: "center",
                    textAlign: "center",
                    borderRadius: "100px",
                    border: "solid",
                    borderColor: hover2 ? "#ff4c29" : "#000000",
                }}
                onMouseOver={() => setHover2(true)}
                onMouseOut={() => setHover2(false)}
                onClick={openModal}
            >
                <span
                    style={{
                        color: "white",
                        fontSize: "5vh",
                        marginTop: "0.5vh",
                        textAlign: "center",
                        alignSelf: "center",
                    }}
                >
                    {React.createElement("i", { className: "bx bx-info-circle" })}
                </span>
            </button>
            <Modal
                isOpen={modalIsOpen}
                onAfterOpen={afterOpenModal}
                onRequestClose={closeModal}
                style={{
                    overlay: {
                        backgroundColor: "#202123",
                        zIndex: 1000,
                        opacity: 0.9,
                        height: "100vh",
                        width: "100vw",
                        display: "flex",
                        alignItems: "center",
                    },
                    content: {
                        color: "black",
                        backgroundColor: "black",
                        height: "70vh",
                        width: "70vw",
                        borderRadius: "10px",
                        margin: "auto",
                    },
                }}
            >
                <div
                    style={{
                        color: "white",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        padding: "30px",
                    }}
                >
                    <span style={{ textAlign: "center", fontSize: "30px", fontWeight: "bold" }}>INFORMATION</span>
                    <span
                        style={{
                            fontSize: "25px",
                            marginTop: "30px",
                            marginBottom: "20px",
                            fontWeight: "bold",
                            color: "#ff4c29",
                        }}
                    >
                        About this page
                    </span>
                    <span style={{ fontSize: "20px" }}>This page is the search page.</span>
                    <span style={{ fontSize: "20px" }}>It allows you to search for a star by its TIC number.</span>
                    <span style={{ fontSize: "20px" }}>
                        Once you have entered the TIC number, you can view the light curve of the star.
                    </span>
                    <span style={{ fontSize: "20px" }}>It also provides information about the star.</span>
                    <span style={{ fontSize: "20px" }}>
                        Click on the "View Light Curve" button to view the light curve of the star.
                    </span>

                    <span
                        style={{
                            fontSize: "25px",
                            marginTop: "20px",
                            marginBottom: "20px",
                            fontWeight: "bold",
                            color: "#ff4c29",
                        }}
                    >
                        About the light curve
                    </span>
                    <span style={{ fontSize: "20px" }}>
                        The light curve shows the brightness of the star over time.
                    </span>
                    <span style={{ fontSize: "20px" }}>It is a graph of the star's magnitude against time.</span>
                    <span style={{ fontSize: "20px" }}>It is used to study the star's variability.</span>

                    <span
                        style={{
                            fontSize: "25px",
                            marginTop: "20px",
                            marginBottom: "20px",
                            fontWeight: "bold",
                            color: "#ff4c29",
                        }}
                    >
                        About the star
                    </span>
                    <span style={{ fontSize: "20px" }}>The star's information is displayed in the table.</span>
                    <span style={{ fontSize: "20px" }}>
                        It includes details about the star's type, temperature, and distance.
                    </span>

                    <span
                        style={{
                            fontSize: "25px",
                            marginTop: "20px",
                            marginBottom: "20px",
                            fontWeight: "bold",
                            color: "#ff4c29",
                        }}
                    >
                        Common Question
                    </span>
                    <span style={{ fontSize: "20px", marginBottom: "20px" }}>1. What is the TIC number?</span>
                    <span style={{ fontSize: "20px" }}>
                        The TIC number is the unique identifier of a star in the TESS Input Catalog.
                    </span>
                    <span style={{ fontSize: "20px" }}>
                        It is used to identify the star and retrieve information about it.
                    </span>
                    <button
                        style={{
                            backgroundColor: "black",
                            color: "white",
                            height: "7%",
                            width: "30%",
                            alignSelf: "center",
                            fontSize: "20px",
                            borderRadius: "10px",
                            marginTop: "30px",
                        }}
                        onClick={closeModal}
                    >
                        Close
                    </button>
                </div>
            </Modal>
        </div>
    );
}

export default Archive;
