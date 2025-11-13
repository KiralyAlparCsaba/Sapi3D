import React from "react";

function Sidebar({ menuItems, activeMenu, setActiveMenu, handleLogout }) {
  return (
    <aside className="sidebar">
      <h2>Funkciók</h2>
      {menuItems.map((item) => (
        <button
          key={item.key}
          onClick={() => setActiveMenu(item.key)}
          className={`menu-btn ${activeMenu === item.key ? "active" : ""}`}
        >
          {item.label}
        </button>
      ))}
      <button onClick={handleLogout} className="logout-btn">
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
