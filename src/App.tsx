import { Routes } from "react-router-dom";
import "./App.css";
import LeftSideBar from "./components/layout/LeftSideBar";
import RightSideBar from "./components/layout/RightSideBar";
import TopBar from "./components/layout/TopBar";
import BottomBar from "./components/layout/BottomBar";

function App() {
  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSideBar />
        <main className="flex-1 overflow-y-auto p-6">
          <p>
              Content Here
          </p>
        </main>
        <RightSideBar />
      </div>
      <BottomBar />
    </div>
  );
}

export default App;
