import { useLayout } from '../components/AppLayout';

export function HomePage() {
  const { appLogoUrl, companyLogoUrl } = useLayout();
  const logoUrl = companyLogoUrl ?? appLogoUrl;

  return (
    <div className="page page--centered">
      <div className="hero-logo">
        {logoUrl ? (
          <img src={logoUrl} alt="Company logo" />
        ) : (
          <div className="hero-logo__placeholder">TiMapp</div>
        )}
      </div>
      <h2>Welcome to TiMapp</h2>
      <p className="page__subtitle">Manage tickets, track activity, and keep teams aligned.</p>
    </div>
  );
}
