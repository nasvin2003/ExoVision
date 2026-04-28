import "./pages.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";

const Search = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [hover, setHover] = useState(false);
    const [hover1, setHover1] = useState(false);
    const [search, setSearch] = useState(true);
    const [vis, setVis] = useState(false);

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

    const navigate = useNavigate();

    const defaultVal = {
        intentType: { 0: "" },
        obs_collection: { 0: "" },
        provenance_name: { 0: "" },
        instrument_name: { 0: "" },
        project: { 0: "" },
        filters: { 0: "" },
        wavelength_region: { 0: "" },
        target_name: { 0: "" },
        target_classification: { 0: "" },
        obs_id: { 0: "" },
        s_ra: { 0: "" },
        s_dec: { 0: "" },
        dataproduct_type: { 0: "" },
        proposal_pi: { 0: "" },
        calib_level: { 0: "" },
        t_min: { 0: "" },
        t_max: { 0: "" },
        t_exptime: { 0: "" },
        em_min: { 0: "" },
        em_max: { 0: "" },
        obs_title: { 0: "" },
        t_obs_release: { 0: "" },
        proposal_id: { 0: "" },
        proposal_type: { 0: "" },
        sequence_number: { 0: "" },
        s_region: { 0: "" },
        jpegURL: { 0: "" },
        dataURL: { 0: "" },
        dataRights: { 0: "" },
        mtFlag: { 0: "" },
        srcDen: { 0: "" },
        obsid: { 0: "" },
        objID: { 0: "" },
        exptime: { 0: "" },
        distance: { 0: "" },
        obsID: { 0: "" },
        obs_collection_products: { 0: "" },
        dataproduct_type_products: { 0: "" },
        description: { 0: "" },
        type: { 0: "" },
        dataURI: { 0: "" },
        productType: { 0: "" },
        productGroupDescription: { 0: "" },
        productSubGroupDescription: { 0: "" },
        productDocumentationURL: { 0: "" },
        project_products: { 0: "" },
        prvversion: { 0: "" },
        proposal_id_products: { 0: "" },
        productFilename: { 0: "" },
        size: { 0: "" },
        parent_obsid: { 0: "" },
        dataRights_products: { 0: "" },
        calib_level_products: { 0: "" },
        author: { 0: "" },
        mission: { 0: "" },
        year: { 0: "" },
        sort_order: { 0: "" },
    };

    const defaultVal1 = {
        "Unique identifier": "",
        "Type of object": "",
        "Source of object type": "",
        "Right Ascension": "",
        Declination: "",
        "Parallax measurement": "",
        "Nearest neighbor distance": "",
        "TESS band magnitude": "",
        "Surface temperature": "",
        "Surface gravity": "",
        "Metal content": "",
        "Stellar radius": "",
        "Stellar mass": "",
        "Stellar density": "",
        "Stellar luminosity": "",
        "Distance to star": "",
    };

    const [dataframe, setDataframe] = useState([defaultVal]);
    const [dataframe1, setDataframe1] = useState([defaultVal1]);
    const [red, setRed] = useState(false);
    const [loader, setLoader] = useState(0);
    useEffect(() => {
        const fetchData = async () => {
            if (searchTerm === "") {
                setDataframe([defaultVal]);
                setDataframe1([defaultVal1]);
                setVis(false);
                return;
            }

            try {
                setLoader(0.8);
                const lightCurvesResponse = await fetch(`/api/planet_meta/${searchTerm}/lightcurves`);
                const lightCurvesData = await lightCurvesResponse.json();
                setDataframe([normalizeData(lightCurvesData, defaultVal)]);

                const metaDataResponse = await fetch(`/api/planet_meta/${searchTerm}/metadata`);
                const metaData = await metaDataResponse.json();
                setDataframe1([normalizeData(metaData, defaultVal1)]);
                setRed(true);
                setLoader(0);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                setLoader(0);
                // Handle errors or set default values
                setRed(false);
            }
        };

        fetchData();
    }, [search]);

    function normalizeData(data, defaultStructure) {
        const normalized = {};
        Object.keys(defaultStructure).forEach((key) => {
            normalized[key] = typeof data[key] !== "undefined" ? data[key] : defaultStructure[key];
        });
        return normalized;
    }
    function processData(dataframe) {
        if (dataframe.length === 0) {
            return [];
        }

        const [data] = dataframe;
        const keys = Object.keys(data);
        const recordCount = Object.keys(data[keys[0]]).length;
        const processedData = [];

        for (let i = 0; i < recordCount; i++) {
            const rowData = {};
            keys.forEach((key) => {
                rowData[key] = data[key][i] || "";
            });
            processedData.push(rowData);
        }

        return processedData;
    }

    const ScrollableTable = ({ data }) => {
        const processedData = processData(data);
        if (processedData.length === 0) {
            return <div />;
        }
        return (
            <div
                style={{ overflowX: "auto", marginTop: "2vh", marginLeft: "22vw", width: "76vw", paddingBottom: "3vh" }}
            >
                <table style={{}}>
                    <thead>
                        <tr>
                            {Object.keys(processedData[0]).map((header) => (
                                <th
                                    style={{
                                        borderColor: "#ffffff",
                                        borderWidth: "1",
                                        borderStyle: "solid",
                                        backgroundColor: "#000000",
                                    }}
                                    key={header}
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody style={{ backgroundColor: "#202123" }}>
                        {processedData.map((row, index) => (
                            <tr key={index}>
                                {Object.values(row).map((cell, cellIndex) => (
                                    <td
                                        style={{ borderColor: "#ffffff", borderWidth: "0.5", borderStyle: "solid" }}
                                        key={cellIndex}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div>
            <div className="app-container">
                <div
                    style={{
                        height: "100vh",
                        width: "80vw",
                        position: "absolute",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
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
                <div className="search-bar-page">
                    <input
                        type="text"
                        placeholder="Search for a star"
                        className="search-page"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        style={{
                            height: "7vh",
                            width: "10%",
                            backgroundColor: "#000000",
                            borderColor: hover ? "#ff4c29" : "#202123",
                            borderRadius: "15px",
                            border: "solid",
                            fontSize: "30px",
                            fontFamily: "Montserrat",
                            padding: "15px",
                            color: "grey",
                            marginBottom: "10px",
                            justifyContent: "center",
                            marginLeft: "10px",
                        }}
                        onMouseOver={() => setHover(true)}
                        onMouseOut={() => setHover(false)}
                        onClick={() => setSearch(!search)}
                    >
                        {React.createElement("i", { className: "bx bx-search" })}
                    </button>
                </div>

                <div
                    style={{
                        height: "7vh",
                        width: "15vw",
                        zIndex: 1,
                        position: "fixed",
                        display: "flex",
                        justifySelf: "center",
                        marginTop: "11.5vh",
                        marginLeft: "63.5vw",
                    }}
                >
                    <button
                        style={{
                            alignSelf: "center",
                            backgroundColor: "#000000",
                            borderColor: hover1 ? "#ff4c29" : "#202123",
                            height: "100%",
                            width: "100%",
                            borderRadius: "15px",
                        }}
                        onMouseOver={() => setHover1(true)}
                        onMouseOut={() => setHover1(false)}
                        onClick={() => {
                            if (red) {
                                navigate(`/analyze/${searchTerm}`);
                            }
                        }}
                    >
                        <span style={{ color: "#ffffff", fontSize: "large", fontFamily: "Montserrat" }}>
                            View Light Curve
                        </span>
                    </button>
                </div>

                <div style={{ height: "30vh", width: "30vw", marginTop: "15vh", marginLeft: "-45vw" }}>
                    {dataframe1.map((row, index) => (
                        <span style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontStyle: "Montesserat", fontSize: "24px" }}>
                                <span>Information about </span>
                                <span>TIC {row["Unique identifier"]}</span>
                            </span>
                            <div
                                style={{
                                    display: "flex",
                                    padding: "3vh",
                                    borderRadius: "30px",
                                    flexDirection: "column",
                                    marginTop: "3vh",
                                    width: "75vw",
                                    backgroundColor: "black",
                                    fontSize: "17px",
                                }}
                            >
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Type of Object : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Type of Object"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Source of object type : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Source of object type"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Right Ascension : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Right Ascension"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Declination : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Declination"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Parallax measurement : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Parallax measurement"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Nearest neighbor distance : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Nearest neighbor distance"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>TESS band magnitude : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["TESS band magnitude"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Surface temperature : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Surface temperature"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Surface gravity : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Surface gravity"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Metal content : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Metal content"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Stellar radius : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Stellar radius"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Stellar mass : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Stellar mass"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Stellar density : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Stellar density"]}</span>
                                </span>
                                <span style={{ paddingBottom: "1vh" }}>
                                    <span>Stellar luminosity : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Stellar luminosity"]}</span>
                                </span>
                                <span style={{}}>
                                    <span>Distance to star : </span>
                                    <span style={{ color: "#ff4c29" }}>{row["Distance to star"]}</span>
                                </span>
                            </div>
                        </span>
                    ))}
                </div>

                <div style={{ marginTop: "28vh", height: "5vh", width: "30vw", marginLeft: "-45vw" }}>
                    <div style={{ marginBottom: "1vh", alignItems: "center" }}>
                        <span style={{ fontSize: "24px", fontStyle: "Montesserat" }}>Available Light Curves</span>
                    </div>
                </div>
            </div>
            <ScrollableTable data={dataframe} />
            <button
                style={{
                    height: "8vh",
                    width: "8vh",
                    backgroundColor: "#000000",
                    marginTop: "3vh",
                    marginLeft: "95vw",
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

export default Search;
