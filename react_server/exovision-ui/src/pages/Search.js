import React, { useState, useEffect } from "react";

const Search = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [hover, setHover] = useState(false);

    const [search, setSearch] = useState(true);

    const [vis, setVis] = useState(false);

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
        "Declination": "",
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
    useEffect(() => {
        const fetchData = async () => {
            if (searchTerm === "") {
                setDataframe([defaultVal]);
                setDataframe1([defaultVal1]);
                setVis(false);
                return;
            }

            try {
                const lightCurvesResponse = await fetch(`/api/planet_meta/${searchTerm}/lightcurves`);
                const lightCurvesData = await lightCurvesResponse.json();
                setDataframe([normalizeData(lightCurvesData, defaultVal)]);

                const metaDataResponse = await fetch(`/api/planet_meta/${searchTerm}/metadata`);
                const metaData = await metaDataResponse.json();
                setDataframe1([normalizeData(metaData, defaultVal1)]);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                // Handle errors or set default values
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
        </div>
    );
};

export default Search;
