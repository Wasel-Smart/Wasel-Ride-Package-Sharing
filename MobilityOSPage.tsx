import { useTranslation } from 'react-i18next';

const MobilityOSPage = () => {
    // The 't' function retrieves translations from your JSON files
    const { t, i18n } = useTranslation('common');

    return (
        <div className="page-container">
            <h1>{t('mobilityOS.title')}</h1>
            <div className="dashboard-stats">
                <p>
                    {t('mobilityOS.dashboard.activeDrivers', { count: new Intl.NumberFormat(i18n.language).format(15) })}
                </p>
                <p>{t('mobilityOS.dashboard.totalRides', { count: new Intl.NumberFormat(i18n.language).format(250) })}</p>
            </div>
            {/* Other components for the Mobility OS page would go here */}
        </div>
    );
};

export default MobilityOSPage;