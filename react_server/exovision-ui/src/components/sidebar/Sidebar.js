import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./sidebar.css";

const sidebarNavItems = [
    {
        display: "Home",
        icon: React.createElement("i", { className: "bx bx-home" }),
        to: "/",
        section: "",
    },
    {
        display: "Search for Stars",
        icon: React.createElement("i", { className: "bx bx-search" }),
        to: "/search",
        section: "search",
    },
    {
        display: "Analyze",
        icon: React.createElement("i", { className: "bx bx-bar-chart-square" }),
        to: "/analyze/empty",
        section: "analyze",
    },
    {
        display: "Star Archive",
        icon: React.createElement("i", { className: "bx bx-box" }),
        to: "/archive",
        section: "archive",
    },
    {
        display: "Custom Analysis",
        icon: React.createElement("i", { className: "bx bx-bot" }),
        to: "/upload",
        section: "upload",
    },
];

const settingsItem = {
    display: "Settings",
    icon: <i className="bx bx-cog"></i>,
    to: "/settings",
    section: "settings",
};

const Sidebar = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [stepHeight, setStepHeight] = useState(0);
    const sidebarRef = useRef();
    const settingsRef = useRef();
    const indicatorRef = useRef();
    const location = useLocation();

    useEffect(() => {
        setTimeout(() => {
            const sidebarItem = sidebarRef.current.querySelector(".sidebar__menu__item");
            indicatorRef.current.style.height = `${sidebarItem.clientHeight}px`;
            setStepHeight(sidebarItem.clientHeight);
        }, 50);
    }, []);

    useEffect(() => {
        const curPath = window.location.pathname.split("/")[1];
        const activeItem = sidebarNavItems.findIndex((item) => item.section === curPath);

        if (curPath === settingsItem.section) {
            setActiveIndex(sidebarNavItems.length);
        } else {
            setActiveIndex(curPath.length === 0 ? 0 : activeItem);
        }
    }, [location]);

    useEffect(() => {
        if (activeIndex === sidebarNavItems.length) {
            const settingsItemPosition = settingsRef.current.offsetTop - window.innerHeight * 0.07;
            indicatorRef.current.style.transform = `translateX(-50%) translateY(${settingsItemPosition}px)`;
        } else {
            indicatorRef.current.style.transform = `translateX(-50%) translateY(${activeIndex * 7}vh)`;
        }
    }, [activeIndex, stepHeight]);

    return (
        <div className="sidebar">
            <div className="sidebar__logo">
                <span>
                    <span style={{ color: "#FF4C29" }}>Exo</span>
                    <span style={{ color: "#FFFFFF" }}>Vision</span>
                </span>
            </div>
            <div className="sidebar__menu" ref={sidebarRef}>
                <div className="sidebar__menu__indicator" ref={indicatorRef} style={{ transform: `translateX(-50%)` }}/>
                    {sidebarNavItems.map((item, index) =>
                        <Link to={item.to} key={index}>
                            <div className={`sidebar__menu__item ${activeIndex === index ? " active" : ""}`}> 
                                <div className="sidebar__menu__item__icon">
                                    {item.icon}
                                </div>
                                <div className="sidebar__menu__item__text">
                                    {item.display}
                                </div>
                            </div>
                        </Link>
                    )}
                
            </div>
    
            <div className="sidebar__menu sidebar__menu--settings" ref={settingsRef}>
                <Link to={settingsItem.to}>
                    <div className={`sidebar__menu__item ${activeIndex === sidebarNavItems.length ? " active" : ""}`}>
                        <div className="sidebar__menu__item__icon">{settingsItem.icon}</div>
                        <div className="sidebar__menu__item__text">{settingsItem.display}</div>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default Sidebar;
