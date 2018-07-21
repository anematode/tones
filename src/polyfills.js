
// https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttributeNames
if (Element.prototype.getAttributeNames === undefined) {
    Element.prototype.getAttributeNames = function () {
        let attributes = this.attributes;
        let length = attributes.length;
        let result = new Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = attributes[i].name;
        }
        return result;
    };
}

const a = 0;
export {a};