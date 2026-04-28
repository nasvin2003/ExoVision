import React, { useState, useRef } from "react";
import "./pages.css";

const Upload = () => {
    const fileInputRef = useRef(null);
    const fileInputRef1 = useRef(null);

    const [plotUrls, setPlotUrls] = useState({ generalPlotUrl: "", trendPlotUrl: "", status: "" });
    const [params, setParams] = useState({ accuracy: "", precision: "", recall: "", f1: "" });

    const [loader, setLoader] = useState(0);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            setLoader(0.8)
            formData.append("file", file);

            try {
                const response = await fetch("/upload", {
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
                setLoader(0)
            } catch (error) {
                console.error("Error uploading the file:", error);
                setLoader(0)
            }
        }
    };

    const handleFileUpload1 = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("/upload_model", {
                    method: "POST",
                    body: formData,
                })
                    .then((response) => response.json())
                    .then((data) => {
                        setParams({
                            accuracy: data.accuracy,
                            precision: data.precision,
                            recall: data.recall,
                            f1: data.f1,
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

    const handleTriggerClick1 = () => {
        fileInputRef1.current.click();
    };

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

            <div style={{ fontSize: "30px", fontStyle: "Montserrat", margin: "30px" }}>
                Use the ExoVision Processed Dataset
            </div>
            <div
                style={{
                    gap: "4vw",
                    height: "30vh",
                    width: "70vw",
                    display: "flex",
                    flexDirection: "row",
                }}
            >
                <div
                    style={{
                        padding: "20px",
                        border: "1px solid #FF4C29",
                        borderRadius: "5px",
                        backgroundColor: "#000",
                        color: "#202123",
                        textAlign: "center",
                        marginTop: "20px",

                        width: "38vw",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                    }}
                    onClick={handleTriggerClick1}
                >
                    <span style={{ fontSize: "100px" }}>{React.createElement("i", { className: "bx bx-bulb" })}</span>
                    <span style={{ fontSize: "50px", fontWeight: "lighter" }}>Click here to upload a model (.h5)</span>
                    <span style={{ fontSize: "25px", fontWeight: "lighter" }}>
                        Please ensure that the model has input size (10000,1) and a final layer of 1 with sigmoid
                        activation.
                    </span>
                </div>
                <div
                    style={{
                        padding: "20px",
                        border: "1px solid #FF4C29",
                        borderRadius: "5px",
                        backgroundColor: "#000",
                        color: "#202123",
                        textAlign: "center",
                        marginTop: "20px",
                        width: "28vw",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                    }}
                >
                    <span style={{ fontSize: "30px", color: "white", marginBottom: "1vh", fontWeight: "lighter" }}>
                        Accuracy : <span style={{ color: "#FF4C29" }}>{params.accuracy}</span>
                    </span>
                    <span style={{ fontSize: "30px", color: "white", marginBottom: "1vh", fontWeight: "lighter" }}>
                        Precision : <span style={{ color: "#FF4C29" }}>{params.precision}</span>
                    </span>
                    <span style={{ fontSize: "30px", color: "white", marginBottom: "1vh", fontWeight: "lighter" }}>
                        Recall : <span style={{ color: "#FF4C29" }}>{params.recall}</span>
                    </span>
                    <span style={{ fontSize: "30px", color: "white", marginBottom: "1vh", fontWeight: "lighter" }}>
                        F1 Score : <span style={{ color: "#FF4C29" }}>{params.f1}</span>
                    </span>
                </div>
            </div>
            <button
                style={{
                    padding: "20px",
                    border: "1px solid #FF4C29",
                    borderRadius: "5px",
                    backgroundColor: "#000",
                    color: "#202123",
                    textAlign: "center",
                    marginTop: "20px",
                    height: "8vh",
                    width: "33vw",
                    display: "flex",
                    marginTop: "3vh",
                    flexDirection: "column",
                    justifyContent: "center",
                }}
                onClick={() => {
                    setPlotUrls({ generalPlotUrl: "", trendPlotUrl: "", status: "" });
                    setParams({ accuracy: "", precision: "", recall: "", f1: "" });
                }}
            >
                <span style={{ fontSize: "30px", color: "white" }}>RESET</span>
            </button>
            <input
                type="file"
                ref={fileInputRef}
                accept=".fits"
                style={{ display: "none" }}
                onChange={handleFileUpload}
            />
            <input
                type="file"
                ref={fileInputRef1}
                accept=".h5"
                style={{ display: "none" }}
                onChange={handleFileUpload1}
            />
        </div>
    );
};

export default Upload;
