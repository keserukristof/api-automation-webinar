'use strict';

const IMPOSSIBLE_FILTER = 'impossible-filter';

module.exports.IMPOSSIBLE_FILTER = IMPOSSIBLE_FILTER;
module.exports.url = (path, query) => [HOST, 'api', path].join('/') + (query ? '?' + query : '');