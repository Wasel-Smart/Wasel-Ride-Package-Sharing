import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  InfoCard,
  PremiumPanel,
  ScreenShell,
  SectionHeader,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { colors, spacing } from '../theme';

const NetworksScreen = React.memo(function NetworksScreen() {
  const { isOnline } = useOffline();

  return (
    <ScreenShell testID="networks-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={isOnline ? 'شبكة مباشرة' : 'آمن بدون إنترنت'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-done' : 'cloud-offline'}
          />
          <StatusPill
            label="الشبكات"
            tone={colors.teal}
            icon="git-network"
          />
        </View>

        <PremiumPanel tone="dark" testID="networks-command-center">
          <SectionHeader
            eyebrow="شبكات واصل"
            title="خريطة شبكة الخطوط"
            body="استعرض شبكات المشاوير المشتركة وخطوط الشركاء ومجموعات المشغلين الموثقين."
            tone="dark"
          />
        </PremiumPanel>

        <InfoCard
          icon="git-network"
          title="شبكات مشاوير نشطة"
          body="خطوط السعة المشتركة مجموعة ضمن شبكات موثقة، وكل شبكة إلها أسعار وتوفر وقواعد تشغيل واضحة."
          tone={colors.teal}
        />
        <InfoCard
          icon="map"
          title="تغطية الخطوط"
          body="الشبكات بتغطي خطوط بين المحافظات وداخل المناطق. اختر شبكة لتشوف المشاوير والمواعيد والسعة مباشرة."
          tone={colors.blue}
        />
        <InfoCard
          icon="people"
          title="مجموعات المشغلين"
          body="كل شبكة بتجمع مشغلين موثقين، ومع كل مجموعة بتشوف الثقة والتقييمات والتغطية."
          tone={colors.green}
        />
        <InfoCard
          icon="flash"
          title="مؤشرات الطلب المباشرة"
          body="ضغط الطلب وتغير الأسعار وتوفر المقاعد ظاهر مباشرة على كل خطوط الشبكة."
          tone={colors.amber}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
});

export default NetworksScreen;
