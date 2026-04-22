import type { ComponentProps, ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import clsx from 'clsx';
import { Button, Card, LayoutContainer } from '../../design-system/components';
import { BRAND, type BrandLogoSize, type BrandSurface } from '../../design-system/brand';
import { BrandLockup } from './BrandIdentity';

export type AppNavItem = {
  end?: boolean;
  icon?: ReactNode;
  label: string;
  path: string;
};

type ResponsiveNavProps = {
  items: readonly AppNavItem[];
  mobile?: boolean;
};

type AppHeaderProps = {
  actions?: ReactNode;
  brandSize?: BrandLogoSize | number;
  onBrandClick?: () => void;
  showMobileNav?: boolean;
  sticky?: boolean;
  subtitle?: string;
  surface?: BrandSurface;
  width?: 'default' | 'wide';
  items?: readonly AppNavItem[];
};

export function SectionContainer({
  children,
  className,
  width = 'wide',
  ...props
}: ComponentProps<typeof LayoutContainer>) {
  return (
    <LayoutContainer {...props} className={clsx('brand-section-container', className)} width={width}>
      {children}
    </LayoutContainer>
  );
}

export function CardShell({
  children,
  className,
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <Card {...props} className={clsx('brand-card-shell', className)}>
      {children}
    </Card>
  );
}

export function PrimaryButton(props: ComponentProps<typeof Button>) {
  return <Button {...props} variant={props.variant ?? 'primary'} />;
}

export function SecondaryButton(props: ComponentProps<typeof Button>) {
  return <Button {...props} variant={props.variant ?? 'secondary'} />;
}

export function StatusChip({
  children,
  tone = 'accent',
}: {
  children: ReactNode;
  tone?: 'accent' | 'default';
}) {
  return <span className="ds-badge" data-tone={tone === 'accent' ? 'accent' : undefined}>{children}</span>;
}

export function ResponsiveNav({ items, mobile = false }: ResponsiveNavProps) {
  const location = useLocation();

  return (
    <nav
      aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}
      className={mobile ? 'ds-mobile-nav' : 'ds-shell-header__nav'}
    >
      {items.map((item) => {
        const active = item.end
          ? location.pathname === item.path
          : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        return (
          <NavLink
            className="ds-nav-link"
            data-active={active}
            key={`${mobile ? 'm' : 'd'}-${item.path}`}
            to={item.path}
          >
            {item.icon}
            {!mobile ? item.label : null}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AppHeader({
  actions,
  brandSize = 'lg',
  onBrandClick,
  showMobileNav = true,
  sticky = true,
  subtitle = BRAND.tagline,
  surface = 'light',
  width = 'wide',
  items = [],
}: AppHeaderProps) {
  return (
    <>
      <header
        className="ds-shell-header"
        style={{
          position: sticky ? 'sticky' : 'relative',
          top: sticky ? 0 : undefined,
          zIndex: sticky ? 20 : undefined,
        }}
      >
        <SectionContainer width={width}>
          <div className="ds-shell-header__inner">
            <button
              className="ds-shell-header__brand"
              onClick={onBrandClick}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: onBrandClick ? 'pointer' : 'default',
              }}
              type="button"
            >
              <BrandLockup
                dense
                showTagline={!items.length}
                size={brandSize}
                surface={surface}
                tagline={subtitle}
                variant={items.length ? 'compact' : 'default'}
              />
            </button>

            {items.length ? <ResponsiveNav items={items} /> : null}

            {actions ? <div className="ds-shell-header__actions">{actions}</div> : null}
          </div>
        </SectionContainer>
      </header>

      {showMobileNav && items.length ? <ResponsiveNav items={items} mobile /> : null}
    </>
  );
}
