import { ContextualTestContext } from 'ava';

export async function expectAsyncToThrow(
  t: ContextualTestContext,
  asyncFn: (...args: any[]) => Promise<any>,
  expectedMessageRegex: RegExp,
  description = ''
) {
  let threw = false,
    message = '';
  try {
    await asyncFn();
  } catch (err) {
    threw = true;
    message = err.message;
  }
  t.true(threw, description);
  t.regex(message, expectedMessageRegex, description);
}
