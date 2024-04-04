import "./pages.css";
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const Analyze = () => {
    const [plotUrls, setPlotUrls] = useState({ generalPlotUrl: "", trendPlotUrl: "" });
    const { tid } = useParams();

    useEffect(() => {
        const identifier = tid;
        if (tid !== "empty") {
            fetch(`/api/graphs/${identifier}/general`)
                .then((response) => response.json())
                .then((data) => {
                    setPlotUrls({
                        generalPlotUrl: data.general_plot_url,
                        trendPlotUrl: data.trend_plot_url,
                    });
                });
        }
    }, []);

    return (
        <div className="app-container">
            {tid !== "empty" ? (
                <div>
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
                                Planet ID:{" "}
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
                                Exoplanet Status:{" "}
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
                        {plotUrls.trendPlotUrl && <img src={plotUrls.trendPlotUrl} alt="Trend Plot" />}
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
        </div>
    );
};

export default Analyze;
