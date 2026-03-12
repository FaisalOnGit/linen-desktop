# OSLA Desktop - Styling Guide

> Panduan visual dan standar styling untuk project OSLA Desktop Application.
> Berfokus pada implementasi Tailwind CSS dan konsistensi UI.

---

## 1. Tailwind Configuration

Konfigurasi dasar untuk warna brand dan tipografi yang digunakan di seluruh aplikasi.

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: "#426BA8", // Main brand color (Blue)
        secondary: "#DEF6FE", // Accent color (Light Blue)
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
};
```

---

## 2. Global Styles

Standardisasi font global dan layer dasar menggunakan CSS.

```css
/* src/index.css */
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-poppins bg-gray-100 min-h-screen text-gray-800;
  }
}
```

---

## 3. Color Scheme Reference

| Purpose            | Color        | Tailwind Class                     |
| ------------------ | ------------ | ---------------------------------- |
| **Primary**        | `#426BA8`    | `bg-primary`, `text-primary`       |
| **Secondary**      | `#DEF6FE`    | `bg-secondary`, `text-secondary`   |
| **Success**        | Green        | `bg-green-600`, `text-green-600`   |
| **Error**          | Red          | `bg-red-600`, `text-red-600`       |
| **Warning**        | Yellow       | `bg-yellow-500`, `text-yellow-500` |
| **Background**     | Gray-100     | `bg-gray-100`                      |
| **Card/Surface**   | White        | `bg-white`                         |
| **Border**         | Gray-300     | `border-gray-300`                  |
| **Text Primary**   | Gray-800     | `text-gray-800`                    |
| **Text Secondary** | Gray-500/600 | `text-gray-500`, `text-gray-600`   |

---

## 4. Common UI Patterns

### Buttons

```jsx
// Primary action button
<button className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95">
  Submit
</button>

// Secondary/Cancel button
<button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all">
  Cancel
</button>

// Danger button
<button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all">
  Delete
</button>

// With icon
<button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
  <Play size={16} />
  <span>Start Scan</span>
</button>
```

### Cards & Containers

```jsx
// Main content card
<div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
  <h2 className="text-xl font-bold mb-4">Title Section</h2>
  {/* Content */}
</div>

// Grid Layout for responsive pages
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Card items */}
</div>
```

### Tables

```jsx
<div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
  <table className="w-full text-left">
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-4 py-3 text-sm font-semibold text-gray-700">No</th>
        <th className="px-4 py-3 text-sm font-semibold text-gray-700">
          Item Name
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-blue-50/50 transition-colors">
        <td className="px-4 py-3 text-sm">1</td>
        <td className="px-4 py-3 text-sm font-medium">Linen A</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Form Inputs

```jsx
// Label standard
<label className="block text-sm font-semibold text-gray-700 mb-1.5">
  Username
</label>

// Text Input
<input
  type="text"
  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
  placeholder="Enter username..."
/>

// React Select styling (Custom)
const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '8px',
    borderColor: state.isFocused ? '#426BA8' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(66, 107, 168, 0.2)' : 'none',
    fontSize: '14px'
  })
};
```

---

## 5. Status & Indicators

### Badges

```jsx
// Success Badge
<span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-full">
  Active
</span>

// Error/Inactive Badge
<span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full">
  Disconnected
</span>
```

### Toast Notifications (Visual Config)

```javascript
// Visual configuration for react-hot-toast in App.jsx
<Toaster
  position="top-right"
  toastOptions={{
    style: {
      background: "#363636",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
    },
    success: {
      iconTheme: { primary: "#10b981", secondary: "#fff" },
    },
    error: {
      iconTheme: { primary: "#ef4444", secondary: "#fff" },
    },
  }}
/>
```

---

**Last Updated:** March 2026
**Maintained by:** PT. Nuansa Cerah Informasi
