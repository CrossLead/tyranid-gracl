"use strict";

var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }
        function rejected(value) {
            try {
                step(generator.throw(value));
            } catch (e) {
                reject(e);
            }
        }
        function step(result) {
            result.done ? resolve(result.value) : new P(function (resolve) {
                resolve(result.value);
            }).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const chai_1 = require('chai');
function expectAsyncToThrow(asyncFn, expectedMessageRegex) {
    let description = arguments.length <= 2 || arguments[2] === undefined ? '' : arguments[2];

    return __awaiter(this, void 0, void 0, function* () {
        let threw = false,
            message = '';
        try {
            yield asyncFn();
        } catch (err) {
            threw = true;
            message = err.message;
        }
        chai_1.expect(threw, description).to.equal(true);
        chai_1.expect(message).to.match(expectedMessageRegex);
    });
}
exports.expectAsyncToThrow = expectAsyncToThrow;
;