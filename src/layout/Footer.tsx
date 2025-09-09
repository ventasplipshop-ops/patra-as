export default function Footer() {
  return (
    <footer className="sticky bottom-0 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur border-t border-gray-200 dark:border-gray-700 z-30">
      <div className="px-4 py-2 text-sm flex items-center justify-between text-gray-600 dark:text-gray-300">
        <span>© {new Date().getFullYear()} POS</span>
        <span>Sidebar overlay · Drawer derecho · Historial inferior</span>
      </div>
    </footer>
  );
}
