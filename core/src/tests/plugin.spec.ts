import type {
  CapacitorInstance,
  GlobalInstance,
  Plugin,
  PluginResultError,
} from '../definitions';
import { createCapacitor } from '../runtime';

describe('plugin', () => {
  let instance: CapacitorInstance;
  let gbl: GlobalInstance;

  beforeEach(() => {
    gbl = {};
  });

  it('error lazy loading implementation', async done => {
    mockAndroidBridge();
    instance = createCapacitor(gbl);

    const Awesome = instance.registerPlugin<AwesomePlugin>('Awesome', {
      android: () => Promise.reject('unable to load module'),
    });

    try {
      await Awesome.mph();
      done('did not throw');
    } catch (e) {
      expect(e).toBe('unable to load module');
      done();
    }
  });

  it('call method on lazy loaded implementation', async () => {
    mockAndroidBridge();
    instance = createCapacitor(gbl);

    const Awesome = instance.registerPlugin<AwesomePlugin>('Awesome', {
      android: () =>
        // lazy load implementation
        Promise.resolve().then(() => {
          return {
            mph: () => 88,
          };
        }),
    });

    const rtn1 = await Awesome.mph();
    expect(rtn1).toBe(88);

    const rtn2 = await Awesome.mph();
    expect(rtn2).toBe(88);
  });

  it('call method on already loaded implementation', async () => {
    mockAndroidBridge();
    instance = createCapacitor(gbl);

    const Awesome = instance.registerPlugin<AwesomePlugin>('Awesome', {
      android: {
        // implementation already ready
        mph: () => 88,
      },
    });

    const rtn1 = await Awesome.mph();
    expect(rtn1).toBe(88);

    const rtn2 = await Awesome.mph();
    expect(rtn2).toBe(88);
  });

  it('call method that had an error', async () => {
    mockAndroidBridge();
    instance = createCapacitor(gbl);

    const Awesome = instance.registerPlugin<AwesomePlugin>('Awesome', {
      android: {
        mph: () => {
          throw new Error('nope!');
        },
      },
    });

    expect(() => {
      Awesome.mph();
    }).toThrowError('nope!');
  });

  it('missing method on lazy loaded implementation', async done => {
    mockAndroidBridge();
    instance = createCapacitor(gbl);

    const Awesome = instance.registerPlugin<AwesomePlugin>('Awesome', {
      android: () =>
        Promise.resolve().then(() => {
          return {};
        }),
    });

    try {
      await Awesome.mph();
      done('did not throw error');
    } catch (e) {
      expect(e.message).toBe('"Awesome" plugin implementation missing "mph"');
      done();
    }
  });

  it('missing method on already loaded implementation', async () => {
    mockAndroidBridge();
    instance = createCapacitor(gbl);

    const Awesome = instance.registerPlugin<AwesomePlugin>('Awesome', {
      android: {},
    });

    expect(() => {
      Awesome.mph();
    }).toThrowError(`"Awesome" plugin implementation missing "mph"`);
  });

  it('no platform implementation', async () => {
    instance = createCapacitor(gbl);

    const Awesome = instance.registerPlugin<AwesomePlugin>('Awesome', {});

    expect(() => {
      Awesome.mph();
    }).toThrowError(`"Awesome" plugin implementation not available for "web"`);
  });

  it('addListener, w/out addListener on implementation', done => {
    mockAndroidBridge({ mph: 88 });
    instance = createCapacitor(gbl);
    const Awesome = instance.registerPlugin<AwesomePlugin>('Awesome', {});

    const rtn = Awesome.addListener('eventName', data => {
      try {
        expect(data).toEqual({ mph: 88 });
        done();
      } catch (e) {
        done(e);
      }
    });

    expect(rtn).toBeDefined();
    expect(typeof rtn.remove === 'function').toBe(true);
  });

  it('removeAllListeners', () => {
    instance = createCapacitor(gbl);
    const Awesome = instance.registerPlugin<AwesomePlugin>('Awesome', {});

    const rtn = Awesome.removeAllListeners();
    expect(rtn).toBeUndefined();
  });

  const mockAndroidBridge = (responseData?: any, err?: PluginResultError) => {
    gbl.androidBridge = {
      postMessage: m => {
        const d = JSON.parse(m);
        Promise.resolve().then(() => {
          instance.fromNative({
            callbackId: d.callbackId,
            methodName: d.methodName,
            data: responseData,
            error: err,
            success: !err,
          });
        });
      },
    };
  };
});

interface AwesomePlugin extends Plugin {
  mph(): Promise<number>;
}