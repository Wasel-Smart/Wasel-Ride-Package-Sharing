const FONT_PRELOAD_SELECTOR = 'link[data-wasel-font-preload="true"]';
const FONT_STYLESHEET_SELECTOR = 'link[data-wasel-font-stylesheet="true"]';
const FONT_STYLESHEET_HREF =
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&family=Cairo:wght@500;600;700;800&display=swap';

function buildStartupMessageNode(
  tagName: 'h1' | 'p',
  text: string,
  styles: Partial<CSSStyleDeclaration>,
): HTMLElement {
  const node = document.createElement(tagName);
  node.textContent = text;
  Object.assign(node.style, styles);
  return node;
}

export function installNonBlockingFonts(doc: Document = document): void {
  const preload = doc.querySelector<HTMLLinkElement>(FONT_PRELOAD_SELECTOR);
  const existingStylesheet = doc.querySelector<HTMLLinkElement>(FONT_STYLESHEET_SELECTOR);

  if (existingStylesheet) {
    return;
  }

  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = preload?.href || FONT_STYLESHEET_HREF;
  stylesheet.setAttribute('data-wasel-font-stylesheet', 'true');

  if (!preload) {
    doc.head.appendChild(stylesheet);
    return;
  }

  preload.addEventListener(
    'load',
    () => {
      if (!doc.head.contains(stylesheet)) {
        doc.head.appendChild(stylesheet);
      }
    },
    { once: true },
  );

  // Fallback in case the preload finishes before the listener is attached.
  window.setTimeout(() => {
    if (!doc.head.contains(stylesheet)) {
      doc.head.appendChild(stylesheet);
    }
  }, 1500);
}

export function renderStartupConfigurationError(options: {
  direction: 'ltr' | 'rtl';
  isArabic: boolean;
  themePreference: 'light' | 'dark' | 'system';
  title: string;
  body: string;
  help: string;
}): void {
  const { direction, isArabic, themePreference, title, body, help } = options;
  const isLight = themePreference === 'light';

  document.body.replaceChildren();

  const shell = document.createElement('div');
  Object.assign(shell.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    fontFamily: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
    background: isLight ? '#f5faff' : '#061726',
    color: isLight ? '#10243d' : '#eff6ff',
  } satisfies Partial<CSSStyleDeclaration>);
  shell.dir = direction;

  const card = document.createElement('div');
  Object.assign(card.style, {
    textAlign: isArabic ? 'right' : 'center',
    maxWidth: '500px',
    padding: '40px',
    background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(10,22,40,0.94)',
    borderRadius: '16px',
    boxShadow: isLight ? '0 12px 36px rgba(16,36,61,0.10)' : '0 12px 36px rgba(0,0,0,0.28)',
    border: isLight ? '1px solid rgba(16,36,61,0.08)' : '1px solid rgba(93,150,210,0.14)',
  } satisfies Partial<CSSStyleDeclaration>);

  card.appendChild(
    buildStartupMessageNode('h1', title, {
      color: isLight ? '#c2410c' : '#fca5a5',
      margin: '0 0 16px',
    }),
  );
  card.appendChild(
    buildStartupMessageNode('p', body, {
      color: isLight ? '#33526f' : 'rgba(239,246,255,0.78)',
      margin: '16px 0',
    }),
  );
  card.appendChild(
    buildStartupMessageNode('p', help, {
      color: isLight ? '#64748b' : 'rgba(239,246,255,0.56)',
      fontSize: '14px',
      margin: '0',
    }),
  );

  shell.appendChild(card);
  document.body.appendChild(shell);
}

