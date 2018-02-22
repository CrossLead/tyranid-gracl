import { ContextualTestContext } from 'ava';

export async function expectAsyncToThrow<R>(
  t: ContextualTestContext,
  asyncFn: () => Promise<R>,
  expectedMessageRegex: RegExp,
  description = ''
) {
  let threw = false;
  let message = '';
  try {
    await asyncFn();
  } catch (err) {
    threw = true;
    message = err.message;
  }
  t.true(threw, description);
  t.regex(message, expectedMessageRegex, description);
}
