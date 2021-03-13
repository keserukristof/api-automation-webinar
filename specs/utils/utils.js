'use strict'

class Utils {
    static getRandomPost(data) {
        const min = 0;
        const max = data.length;
        return data[Math.floor(Math.random() * (max - min + 1)) + min];
    }

    /**
     *
     * @param max: The largest value that the function can return.
     * @returns {number}: A number between 1 and the max value.
     */
    static getRandomId(max) {
        return Math.floor(Math.random() * max) + 1;
    }
}

module.exports = Utils;