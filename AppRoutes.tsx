import { useEffect } from 'react';
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useParams,
    Outlet,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MobilityOSPage from './pages/MobilityOSPage';

// This wrapper component syncs the URL language with the i18n library
const LanguageWrapper = () => {
    const { lang } = useParams<{ lang: string }>();
    const { i18n } = useTranslation();

    useEffect(() => {
        if (lang && i18n.language !== lang) {
            i18n.changeLanguage(lang);
            document.documentElement.lang = lang;
            document.documentElement.dir = i18n.dir(lang);
        }
    }, [lang, i18n]);

    return <Outlet />; // Renders the nested child route
};

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/:lang" element={<LanguageWrapper />}>
                    <Route path="app/mobility-os" element={<MobilityOSPage />} />
                    {/* Add other localized application routes here */}
                </Route>
                <Route path="*" element={<Navigate to="/ar/app/mobility-os" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;