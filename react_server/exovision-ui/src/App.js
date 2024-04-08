import "./App.css";
import "boxicons/css/boxicons.min.css";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Blank from "./pages/Blank";
import Analyze from "./pages/Analyze";
import Archive from "./pages/Archive";
import Home from "./pages/Home";
import Search from "./pages/Search"

function App() {
    return (
        <div className="app">
            <BrowserRouter>
                <Routes>
                    <Route index element={<Home />} />
                    <Route path="/" element={<AppLayout />}>
                        <Route path="/search" element={<Search />} />
                        <Route path="/analyze/:tid" element={<Analyze />} />
                        <Route path="/archive" element={<Archive />} />
                        <Route path="/settings" element={<Blank />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </div>
    );
}

export default App;
