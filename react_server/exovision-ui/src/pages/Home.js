import React, { useRef, useEffect } from "react";
import "./pages.css";
import { useNavigate } from "react-router-dom";

const Home = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);

    useEffect(() => {
        // Check if videoRef.current is not null before trying to access playbackRate
        if (videoRef.current) {
            videoRef.current.playbackRate = 3; // Slow down the video to half its original speed
        }
    }, []); // The empty array ensures this effect runs only once when the component mounts
    return (
        <div className="home__page__screen">
            <div
                className="video-background"
                style={{ width: "100vw", height: "100vh", overflow: "hidden", zIndex: 1 }}
            >
                <video
                    autoPlay
                    muted
                    style={{ width: "100vw", height: "100vh", objectFit: "cover", position: "fixed" }}
                >
                    <source src={`${process.env.PUBLIC_URL}/bg.mp4`} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>

            <div style={{ position: "fixed", marginTop: "-65vh", marginLeft: "60vw", zIndex: 2, textAlign: "right" }}>
                <div>
                    <span
                        style={{
                            color: "white",
                            fontSize: "100px",
                            fontFamily: "Montserrat",
                            fontWeight: 650,
                            fontStyle: "italic",
                            textShadow: "10px 10px 10px #000000",
                        }}
                    >
                        DISCOVER
                    </span>
                </div>
                <div>
                    <span
                        style={{
                            color: "white",
                            fontSize: "100px",
                            fontFamily: "Montserrat",
                            fontWeight: 650,
                            fontStyle: "italic",
                            textShadow: "10px 10px 10px #000000",
                        }}
                    >
                        BEYOND
                    </span>
                </div>
                <div>
                    <span
                        style={{
                            color: "white",
                            fontSize: "100px",
                            fontFamily: "Montserrat",
                            fontWeight: 650,
                            fontStyle: "italic",
                            textShadow: "10px 10px 10px #000000",
                        }}
                    >
                        HORIZONS
                    </span>
                </div>
            </div>

            <div
                style={{
                    zIndex: 1,
                    justifySelf: "center",
                    justifyContent: "center",
                    alignSelf: "center",
                    height: "100vh",
                    width: "100vw",
                    position: "fixed",
                }}
            >
                <div className="welcome__logo">
                    <span>
                        <span style={{ color: "#FF4C29", fontWeight: 650 }}> Exo</span>
                        <span style={{ color: "#FFFFFF", fontWeight: 650 }}>Vision</span>
                    </span>
                </div>
                <div className="buttons__home">
                    <div className="nav__button__home" onClick={() => navigate(`/search`)}>
                        <span style={{ fontSize: "30px" }}>Search for Stars</span>
                    </div>
                    <div className="nav__button__home" onClick={() => navigate(`/analyze/empty`)}>
                        <span style={{ fontSize: "30px" }}>Analyze Light Curves</span>
                    </div>
                    <div className="nav__button__home" onClick={() => navigate(`/archive`)}>
                        <span style={{ fontSize: "30px" }}>Browse Star Archive</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
