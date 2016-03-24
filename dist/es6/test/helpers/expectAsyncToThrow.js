"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const chai_1 = require('chai');
function expectAsyncToThrow(asyncFn, expectedMessageRegex, description = '') {
    return __awaiter(this, void 0, void 0, function* () {
        let threw = false, message = '';
        try {
            yield asyncFn();
        }
        catch (err) {
            threw = true;
            message = err.message;
        }
        chai_1.expect(threw, description).to.equal(true);
        chai_1.expect(message).to.match(expectedMessageRegex);
    });
}
exports.expectAsyncToThrow = expectAsyncToThrow;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0QXN5bmNUb1Rocm93LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vdGVzdC9oZWxwZXJzL2V4cGVjdEFzeW5jVG9UaHJvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSx1QkFBdUIsTUFBTSxDQUFDLENBQUE7QUFFOUIsNEJBQ0ksT0FBeUMsRUFDekMsb0JBQTRCLEVBQzVCLFdBQVcsR0FBRyxFQUFFOztRQUdsQixJQUFJLEtBQUssR0FBRyxLQUFLLEVBQ2IsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUM7WUFDSCxNQUFNLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUU7UUFBQSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2IsS0FBSyxHQUFHLElBQUksQ0FBQztZQUNiLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO1FBQ3hCLENBQUM7UUFFRCxhQUFNLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsYUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUNqRCxDQUFDOztBQWpCcUIsMEJBQWtCLHFCQWlCdkMsQ0FBQTtBQUFBLENBQUMifQ==