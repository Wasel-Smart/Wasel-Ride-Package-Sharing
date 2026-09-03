import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WaselStateCard } from '@/components/system/WaselStateCard';
import { useLanguage } from '@/contexts/LanguageContext';

export function ForbiddenPage() {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <WaselStateCard
      eyebrow="403"
      title={ar ? 'غير مصرح بالوصول' : 'Access forbidden'}
      description={
        ar
          ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة. إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم.'
          : 'You do not have permission to access this page. If you believe this is an error, contact support.'
      }
      icon={AlertTriangle}
      tone="danger"
      minHeight="80vh"
      actions={
        <>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <a href="/app">{ar ? 'اذهب إلى لوحة التحكم' : 'Go to dashboard'}</a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <a href="/">{ar ? 'العودة للرئيسية' : 'Go home'}</a>
          </Button>
        </>
      }
    />
  );
}
