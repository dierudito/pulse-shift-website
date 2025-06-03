// src/layouts/MainLayout.tsx
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import styles from './MainLayout.module.css';

/**
 * @interface MainLayoutProps
 * @description Props for the MainLayout component.
 * Currently, it does not accept any specific props beyond children (handled by Outlet).
 */
interface MainLayoutProps {}

/**
 * @function MainLayout
 * @description Provides the main structure for the application, including a navigation menu.
 * @param {MainLayoutProps} props - The props for the component.
 * @returns {JSX.Element} The rendered layout with navigation and content area.
 */
const MainLayout: React.FC<MainLayoutProps> = () => {
  return (
    <div className={styles.layoutContainer}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Pulse Shift</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>Registrar Ponto</Link>
          <Link to="/activities" className={styles.navLink}>Registrar Atividades</Link>
        </nav>
      </header>
      <main className={styles.mainContent}>
        <Outlet /> {/* Child routes will render here */}
      </main>
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Pulse Shift. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default MainLayout;