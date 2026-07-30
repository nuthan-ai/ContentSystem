import { Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import Dashboard from "./pages/Dashboard";
import RunHistory from "./pages/RunHistory";
import Settings from "./pages/Settings";

function App() {
  return (
    <div className="min-h-screen" style={{ background: "var(--surface-0)" }}>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/runs" element={<RunHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
