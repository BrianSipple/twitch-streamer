window.onload = function () {


    // Wire up DOM elements
    var resultsListContainer = document.querySelector('.results-list-container'),
        mainViewContainer = document.querySelector('.main-view-container'),
        totalResultsCountElem = document.querySelector('.results-count'),
        searchInput = document.querySelector('#searchInput'),
        searchSubmitButton = document.querySelector('#searchSubmit'),
        searchForm = document.querySelector('#searchForm'),
        errorDialog = document.querySelector('.error-dialog'),
        streamListContainer = document.querySelector('stream-list-container'),
        prevPageButton = document.querySelector('.page-nav.prev'),
        nextPageButton = document.querySelector('.page-nav.next'),


        currentPage = 0,
        isSearching = false,

        // Settings for XHR
        BASE_URL = 'https://api.twitch.tv/kraken/search/streams?q=starcraft',
        MAX_XHR_WAITING_TIME = 5000,  // 5000ms --> 5s


        listContent = {
            pageSize: 5,  // initialize a default page size
            numStreams: 0,
            totalPages: 1,
            streams: undefined  // FILL here with data necessary for rendering the search results
        },

        loadJSONP = (function loadJSONP () {

            var callCount = 0;

            return function (url, callback, context) {
                // INIT
                var name = '_jsonp_' + callCount++;

                // First, check whether a url has already been fully made EXCEPT for the
                // necessary callback parameter
                if (url.match(/callback=/)) {
                    url = url.replace(/callback=/, 'callback=' + name);

                } else if (url.match(/\?/)) {
                    url += '?callback=' + name;
                }

                // create the script
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = url;

                // Setup handler
                window[name] = function (data) {

                    // Execute the callback
                    callback.call( (context || window), data);

                    // cleanup
                    document.querySelector('head').removeChild(script);
                    script = null;
                    delete window[name];
                };

                // Load ze JSON
                document.querySelector('head').appendChild(script);
            };

        }());


    searchForm.addEventListener('submit', handleSearchSubmit);

    prevPageButton.addEventListener('click', decrementPage);
    nextPageButton.addEventListener('click', incrementPage);


    function handleSearchSubmit(e) {

        e.preventDefault();
        debugger;

        var searchString = this.searchInput.value;

        if (!isSearching) {

            isSearching = true;
            searchSubmitButton.classList.add('disabled');

            searchForStreams(searchString).then(function (resp) {
                isSearching = false;
                searchSubmitButton.classList.remove('disabled');
            });
        }
    }


    function createCORSRequest(method, url) {

        var req = new XMLHttpRequest();

        if ('withCredentials' in req) {
            // Check if the XMLHttpRequest object has a "withCredentials" property.
            // "withCredentials" only exists on XMLHTTPRequest2 objects.
            req.open(method, url, true);

        } else {
            req = null;
        }
        return req;
    }




    /**
     * Return a new Promise based upon sending an XHR request for data
     * to the given url
     */
    function getJSONP(url) {

        return new Promise(function (resolve, reject) {

            //var req = createCORSRequest('GET', url);
            //
            //if (!req) {
            //    reject(Error('CORS not supported with this browser'));
            //}
            //
            //var reqTimer = setTimeout(function () {  // if XHR won't finish before timeout, trigger a failure
            //    req.abort();
            //}, MAX_XHR_WAITING_TIME);
            //
            //req.onload = function () {
            //
            //    // onload is called even on a 404, so check the status
            //    if (req.status === 200) {
            //        clearTimeout(reqTimer);
            //        resolve(req.responseText);
            //
            //    } else {
            //        // Otherwise reject with the status text
            //        // which will hopefully be a meaningful error
            //        reject(Error(req.statusText));
            //    }
            //};
            //
            //// Account for exceeding the timeout limit
            //req.onabort = function () {
            //    reject(Error('Request exceeded timeout limit of ' + MAX_XHR_WAITING_TIME + 'ms'));
            //};
            //
            //// Account for any networking errors that might occur
            //req.onerror = function () {
            //    reject(Error('Network Error'));
            //};
            //
            //// Decorate the request with the proper headers needed for API access
            //req.setRequestHeader('Accept', 'application/vnd.twitchtv.v3+json, application/json');
            //req.withCredentials = true;
            //
            //// Here we go!
            //req.send();

            loadJSONP(url, function (data) {
                debugger;
                if (data) {
                    resolve(data);

                } else {
                    reject();
                }
            });

        });
    }





    function makeUrlStringFromSearchInput(searchString) {

        var callbackParam = '&callback=';   // Currently, JSON_P needs to be used with the Twitch API (https://github.com/justintv/Twitch-API/issues/133)

        return (searchString !== 'undefined') ?
            BASE_URL + callbackParam :
            BASE_URL + encodeURIComponent(searchString) + callbackParam;
    }


    function searchForStreams(searchString) {


        var urlString = makeUrlStringFromSearchInput(searchString);

        return getJSONP(urlString).then(function (response) {

            debugger;

            var results = response.streams;

            if (results) {
                listContent.streams = results;  // store results
                listContent.numStreams = response._total;
                listContent.totalPages = Math.ceil(listContent.numStreams / listContent.pageSize);
                renderStreams(results.slice(0, listContent.pageSize));  // render results for the first page

            } else {
                reportNoMatch();  // TODO: Implement
            }

        }).catch(function (error) {
            // TODO: Handle any errors from the search operation
        });
    }

    /**
     * Given a list of streams, build up, then inject,
     * a list fragment into the streams container
     */
    function renderStreams(streams) {
        console.log(streams);
    }


    function reportNoMatch() {
        console.log('Successful search operation, but no streams found');
    }


    function decrementPage() {

        if (currentPage > 1) {

            currentPage--;

            var startIndex = (currentPage - 1) * listContent.pageSize,
                streamsToRender = listContent.streams.slice(startIndex, startIndex + listContent.pageSize);

            renderStreams(streamsToRender);

            if (currentPage === 1) {
                prevPageButton.classList.add('disabled');
            }

            nextPageButton.classList.remove('disabled');  // QUESTION: Correct placement of class removal?
        }
    }

    function incrementPage() {

        if (currentPage < listContent.totalPages) {

            currentPage++;

            var startIndex = (currentPage - 1) * listContent.pageSize,
                streamsToRender = listContent.streams.slice(startIndex, startIndex + listContent.pageSize);

            renderStreams(streamsToRender);

            if (currentPage === listContent.totalPages) {
                nextPageButton.disable();
                nextPageButton.classList.add('disabled');
            }

            prevPageButton.classList.remove('disabled');  // QUESTION: Correct placement of class removal?


        }
    }
};
