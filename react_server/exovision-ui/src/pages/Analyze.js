import "./pages.css";
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Modal from "react-modal";

const Analyze = () => {
    const [plotUrls, setPlotUrls] = useState({ generalPlotUrl: "", trendPlotUrl: "" });
    const { tid } = useParams();

    const [hover2, setHover2] = useState(false);
    const [modalIsOpen, setIsOpen] = React.useState(false);

    const [loader, setLoader] = useState(0.8);

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
        setLoader(0.8)
        const identifier = tid;
        if (tid !== "empty") {
            fetch(`/api/graphs/${identifier}/general`)
                .then((response) => response.json())
                .then((data) => {
                    setPlotUrls({
                        generalPlotUrl: data.general_plot_url,
                        trendPlotUrl: data.trend_plot_url,
                        status: data.status,
                    });
                    setLoader(0)
                });
        }
    }, []);

    return (
        <div className="app-container">

            <div
                style={{
                    height: "100vh",
                    width: "80vw",
                    position: "absolute",
                    alignSelf: "center",
                    display:"flex",
                    justifyContent:"center",
                    backgroundColor: "#090707",
                    zIndex: 1000,
                    opacity: loader,
                    display: loader == 0 ? "none" : "flex",
                }}
            >
                <img
                    src={`${process.env.PUBLIC_URL}/loader.gif`}
                    alt="Loading..."
                    style={{ height: "50vh", width: "50vh", marginTop: "20vh" }}
                />
            </div>

            {tid !== "empty" ? (
                <div style={{ marginTop: "5vh" }}>
                    <div style={{ display: "flex", height: "7vh", marginBottom: "20px", width: "100%" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                width: "35%",
                                marginRight: "20px",
                                backgroundColor: "black",
                                borderRadius: "15px",
                                height: "100%",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "Montserrat",
                                    fontSize: "20px",
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    paddingLeft: "15px",
                                }}
                            >
                                Planet ID: <span style={{ color: "#FF4C29" }}>{tid}</span>
                            </span>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                width: "65%",
                                backgroundColor: "black",
                                borderRadius: "15px",
                                height: "100%",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "Montserrat",
                                    fontSize: "20px",
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    paddingLeft: "15px",
                                }}
                            >
                                Exoplanet Status: <span style={{ color: "#FF4C29" }}>{plotUrls.status}</span>
                            </span>
                        </div>
                    </div>
                    <div className="graph-container">
                        <div className="container-text">
                            <h2 className="graph-text">General Flux Visualisation</h2>
                        </div>
                        {plotUrls.generalPlotUrl && <img src={plotUrls.generalPlotUrl} alt="General Plot" />}
                    </div>
                    <div className="graph-container">
                        <div className="container-text">
                            <h2 className="graph-text">Transit Trend Visualisation</h2>
                        </div>
                        {plotUrls.trendPlotUrl && (
                            <img src={plotUrls.trendPlotUrl} style={{ height: "100%" }} alt="Trend Plot" />
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ height: "100vh", width: "100%", display: "flex", justifyContent: "center" }}>
                    <div style={{ height: "60vh", width: "70vw", justifyContent: "center", display: "flex" }}>
                        <div
                            style={{
                                fontSize: "250px",
                                textAlign: "center",
                                alignSelf: "center",
                                justifySelf: "center",
                                borderWidth: "3px",
                                borderColor: "#00000",
                                borderStyle: "solid",
                                padding: "70px",
                                borderRadius: "30px",
                            }}
                        >
                            {React.createElement("i", { className: "bx bx-error" })}
                            <p
                                style={{
                                    font: "Montesserat",
                                    fontSize: "50px",
                                    fontWeight: "bold",
                                    marginTop: "-30px",
                                }}
                            >
                                Star ID Unavailable!
                            </p>
                            <p style={{ font: "Montesserat", fontSize: "25px", fontWeight: "bold", marginTop: "30px" }}>
                                Please select a valid star from the Star Archive or by searching it in the Search Page
                            </p>
                        </div>
                    </div>
                </div>
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
};

export default Analyze;
