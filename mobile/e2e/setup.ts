import { device } from 'detox';

beforeAll(async () => {
  await device.launchApp({
    permissions: {
      location: 'always',
      notifications: 'YES',
      camera: 'YES',
    },
  });
});

afterAll(async () => {
  await device.terminateApp();
});

beforeEach(async () => {
  await device.reloadReactNative();
});
