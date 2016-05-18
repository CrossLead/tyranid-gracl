import { expect } from 'chai';

export async function expectAsyncToThrow(
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

  expect(threw, description).to.equal(true);
  expect(message, description).to.match(expectedMessageRegex);
};
