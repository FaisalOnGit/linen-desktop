import logo from "../../public/osla.png";

const Navbar = ({ activePage, onNavigate }) => {
  const navItems = [
    { id: "reader", label: "Setting Reader" },
    { id: "sorting", label: "Register Linen" },
    { id: "register", label: "Linen Bersih" },
    // { id: "grouping", label: "Grouping Linen" },
    { id: "delivery", label: "Delivery Linen" },
  ];

  return (
    <nav className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <img
              src={logo}
              alt="OSLA Logo"
              className="h-14 w-auto object-contain"
            />
          </div>
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activePage === item.id
                    ? "bg-secondary text-primary font-medium"
                    : "text-white hover:bg-blue-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
