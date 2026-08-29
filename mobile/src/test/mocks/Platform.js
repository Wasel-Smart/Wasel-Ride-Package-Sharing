const Platform = {
  OS: 'ios',
  Version: 1,
  isTesting: true,
  select: (configs) => configs.ios ?? configs.default ?? configs.android ?? null,
};

module.exports = Platform;
