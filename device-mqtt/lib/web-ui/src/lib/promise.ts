
/* ========================================================================== */

export type Cancel = () => void;

export type PromiseSleep = Promise<boolean> & { cancel: Cancel };

/* ========================================================================== */

export function sleep(millis: number): PromiseSleep {
  let timeout: NodeJS.Timeout | null, promiseResolve: ((finalized: boolean) => void) | null;
  const promise: PromiseSleep = new Promise<boolean>((resolve) => {
    promiseResolve = resolve;
    timeout = setTimeout(() => resolve(true), millis);
  }) as any;
  promise.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      promiseResolve && promiseResolve(false);
      timeout = null;
      promiseResolve = null;
    }
  };
  return promise;
}