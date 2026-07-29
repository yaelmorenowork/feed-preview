/**
 * Races a promise against a timeout, rejecting with `message` if the
 * promise hasn't settled in time. Used to make sure a single hung
 * network request (e.g. Notion API being slow/unreachable) can never
 * leave the widget stuck in a loading state forever.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
