import { useNavigate } from 'react-router';
import { LandingPage } from './LandingPage';

export function LandingPageWrapper() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/app/auth?tab=signup');
  };

  const handleLogin = () => {
    navigate('/app/auth?tab=login');
  };

  const handleExploreRides = () => {
    navigate('/app/find-ride');
  };

  const handleOfferRide = () => {
    navigate('/app/offer-ride');
  };

  const handleExplorePackages = () => {
    navigate('/app/packages');
  };

  return (
    <LandingPage 
      onGetStarted={handleGetStarted}
      onLogin={handleLogin}
      onExploreRides={handleExploreRides}
      onOfferRide={handleOfferRide}
      onExplorePackages={handleExplorePackages}
    />
  );
}
