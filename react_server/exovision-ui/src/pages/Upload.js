import React, { useState, useRef } from "react";
import "./pages.css";

const Upload = () => {
    const fileInputRef = useRef(null);

    const [plotUrls, setPlotUrls] = useState({ generalPlotUrl: "", trendPlotUrl: "", status: "" });

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("http://127.0.0.1:5000/upload", {
                    method: "POST",
                    body: formData, // Pass the entire formData object
                })
                    .then((response) => response.json())
                    .then((data) => {
                        setPlotUrls({
                            generalPlotUrl: data.general_plot_url,
                            trendPlotUrl: data.trend_plot_url,
                            status: data.status,
                        });
                    });
            } catch (error) {
                console.error("Error uploading the file:", error);
            }
        }
    };

    const handleTriggerClick = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="app-container">
            <div style={{ fontSize: "30px", fontStyle: "Montserrat", margin: "30px" }}>
                Use the ExoVision Deep Learning Model
            </div>
            {plotUrls.status === "Potential Exoplanet Candidate" ||
            plotUrls.status === "No Exoplanet Transit Signals Detected" ? (
                <div
                    style={{
                        padding: "20px",
                        border: "1px solid #FF4C29",
                        borderRadius: "5px",
                        backgroundColor: "#000",
                        color: "#202123",
                        textAlign: "center",
                        marginTop: "20px",
                        height: "30vh",
                        width: "70vw",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                    }}
                >
                    {plotUrls.trendPlotUrl && (
                        <div style={{ height: "100%", width: "100%" }}>
                            <div
                                style={{
                                    height: "7vh",
                                    marginTop: "21vh",
                                    width: "25%",
                                    backgroundColor: "black",
                                    position: "absolute",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    borderTopRightRadius: "25px",
                                }}
                            >
                                <span
                                    style={{
                                        color: "#FF4C29",
                                        fontSize: "27px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "100%",
                                        height: "100%",
                                    }}
                                >
                                    {plotUrls.status}
                                </span>
                            </div>
                            <img
                                src={plotUrls.trendPlotUrl}
                                style={{ height: "100%", width: "100%" }}
                                alt="Trend Plot"
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div
                    style={{
                        padding: "20px",
                        border: "1px solid #FF4C29",
                        borderRadius: "5px",
                        backgroundColor: "#000",
                        color: "#202123",
                        textAlign: "center",
                        marginTop: "20px",
                        height: "30vh",
                        width: "70vw",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                    }}
                    onClick={handleTriggerClick}
                >
                    <span style={{ fontSize: "100px" }}>
                        {React.createElement("i", { className: "bx bx-file-find" })}
                    </span>
                    <span style={{ fontSize: "50px", fontWeight: "lighter" }}>Click here to upload a FITS file</span>
                </div>
            )}
            <input
                type="file"
                ref={fileInputRef}
                accept=".fits"
                style={{ display: "none" }}
                onChange={handleFileUpload}
            />
        </div>
    );
};

export default Upload;
