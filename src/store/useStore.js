import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Filtros globales
  selectedPeriod: 'abril-2026',
  selectedCity: 'PEREIRA',
  selectedZone: 'Todas',
  selectedProvider: 'Todas',
  selectedSeller: 'Todas',
  sidebarOpen: true,
  darkMode: true,

  // Acciones
  setPeriod: (period) => set({ selectedPeriod: period }),
  setCity: (city) => set({ selectedCity: city }),
  setZone: (zone) => set({ selectedZone: zone }),
  setProvider: (provider) => set({ selectedProvider: provider }),
  setSeller: (seller) => set({ selectedSeller: seller }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  // Notificaciones
  notifications: [
    {
      id: 1,
      type: 'warning',
      title: 'Devoluciones altas',
      message: 'Sandra M. García tiene 11.4% de devoluciones',
      time: 'Hace 2h',
      read: false,
    },
    {
      id: 2,
      type: 'success',
      title: 'Meta superada',
      message: 'Zona M9458 alcanzó 111.8% de cumplimiento',
      time: 'Hace 3h',
      read: false,
    },
    {
      id: 3,
      type: 'info',
      title: 'Crecimiento Alpina',
      message: 'Alpina creció 21.79% vs año anterior',
      time: 'Hace 5h',
      read: true,
    },
    {
      id: 4,
      type: 'danger',
      title: 'Caída en ventas',
      message: 'Alimentos Polar cayó -63.41%',
      time: 'Hace 6h',
      read: false,
    },
  ],
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));

export default useStore;
