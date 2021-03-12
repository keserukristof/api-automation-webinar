class Utils {
    static getRandomPost (data) {
        const min = 0;
        const max = data.length;
        return data[Math.floor(Math.random() * (max - min + 1) + min)];
    }
}

module.exports = Utils;
