import "./pages.css";
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const Analyze = () => {
    const [plotUrls, setPlotUrls] = useState({ generalPlotUrl: "", trendPlotUrl: "" });
    const [data, setData] = useState([]);
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

    useEffect(() => {
        fetch("/api/archive")
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                console.log(data);
            });
    });

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
                <p>NO PLANETSSS</p>
            )}
        </div>
    );
};

export default Analyze;
