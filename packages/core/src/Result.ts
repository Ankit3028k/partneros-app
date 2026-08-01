export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  err<E = Error>(error: E): Result<never, E> {
    return { ok: false, error };
  },
  map<T, U, E = Error>(result: Result<T, E>, fn: (v: T) => U): Result<U, E> {
    if (result.ok) return Result.ok(fn(result.value));
    return result;
  },
  flatMap<T, U, E = Error>(result: Result<T, E>, fn: (v: T) => Result<U, E>): Result<U, E> {
    if (result.ok) return fn(result.value);
    return result;
  },
  unwrapOr<T>(result: Result<T>, fallback: T): T {
    if (result.ok) return result.value;
    return fallback;
  },
};
