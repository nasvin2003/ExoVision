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
