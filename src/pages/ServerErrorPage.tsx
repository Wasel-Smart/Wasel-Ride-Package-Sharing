import { ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WaselStateCard } from '@/components/system/WaselStateCard';
import { useLanguage } from '@/contexts/LanguageContext';

export function ServerErrorPage() {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <WaselStateCard
      eyebrow="500"
      title={ar ? 'خطأ في الخادم' : 'Server error'}
      description={
        ar
          ? 'حدث خطأ غير متوقع. جرب إعادة تحميل الصفحة أو عد لاحقاً.'
          : 'An unexpected error occurred. Try reloading the page or come back later.'
      }
      icon={ServerCrash}
      tone="danger"
      minHeight="80vh"
      actions={
        <>
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {ar ? 'إعادة تحميل' : 'Reload page'}
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <a href="/app">{ar ? 'اذهب إلى لوحة التحكم' : 'Go to dashboard'}</a>
          </Button>
        </>
      }
    />
  );
}
