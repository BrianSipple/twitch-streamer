window.onload = function () {


    var BASE_URL = 'https://api.twitch.tv/kraken/search/streams?q=starcraft',
        MAX_XHR_WAITING_TIME = 5000,  // 5000ms --> 5s

    //////////////// Wire up some initial references to DOM elements that we'll be manipulating ////////////////
        mainViewContainer = document.querySelector('.main-view-container'),
        totalResultsCountElem = document.querySelector('.results-count-container'),

    // Search input references
        searchInput = document.querySelector('#searchInput'),
        searchSubmitButton = document.querySelector('#searchSubmit'),
        searchForm = document.querySelector('#searchForm'),
        errorDialog = document.querySelector('.error-dialog'),


    // Stream List references
        streamListContainer = document.querySelector('.stream-list-container'),
        streamListFrag = document.createDocumentFragment(),


    // Page nav references
        currentPageNumberElem = document.querySelector('.current-page-number'),
        totalPagesElem = document.querySelector('.total-pages'),
        prevPageButton = document.querySelector('.page-nav.prev'),
        nextPageButton = document.querySelector('.page-nav.next'),


    //////////////// State tracking variables ////////////////
        currentPage = 1,
        isSearching = false,

        listContent = {
            pageSize: 5,  // initialize a default page size
            numStreams: 0,
            totalPages: 1,
            currentPageElem: undefined
        },

    // Helper for setting a JSONP callback when making API requests
    // (Currently, JSON_P needs to be used with the Twitch API (https://github.com/justintv/Twitch-API/issues/133)
        loadJSONP = (function loadJSONP() {

            var callCount = 0;

            return function (url, callback, context) {
                // INIT
                var name = '_jsonp_' + callCount++;

                // First, check whether a url has already been fully made EXCEPT for the
                // necessary callback parameter
                if (url.match(/callback=/)) {
                    url = url.replace(/callback=/, 'callback=' + name);

                } else if (url.match(/\?/)) {
                    url += '&callback=' + name;
                }

                // create the script
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = url;

                // Setup handler
                window[name] = function (data) {

                    // Execute the callback
                    callback.call((context || window), data);

                    // cleanup
                    document.querySelector('head').removeChild(script);
                    script = null;
                    delete window[name];
                };

                // Load ze JSON
                document.querySelector('head').appendChild(script);
            };

        }());

    //////////////// Event listeners ////////////////
    searchForm.addEventListener('submit', handleSearchSubmit);
    prevPageButton.addEventListener('click', decrementPage);
    nextPageButton.addEventListener('click', incrementPage);


    function handleSearchSubmit(e) {

        e.preventDefault();

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


    // TODO: Determine if needed
    //function createCORSRequest(method, url) {
    //
    //    var req = new XMLHttpRequest();
    //
    //    if ('withCredentials' in req) {
    //        // Check if the XMLHttpRequest object has a "withCredentials" property.
    //        // "withCredentials" only exists on XMLHTTPRequest2 objects.
    //        req.open(method, url, true);
    //
    //    } else {
    //        req = null;
    //    }
    //    return req;
    //}


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
                if (data) {
                    resolve(data);

                } else {
                    reject();
                }
            });

        });
    }


    function makeUrlStringFromSearchInput(searchString) {

        var callbackParam = '&callback=',   // Currently, JSON_P needs to be used with the Twitch API (https://github.com/justintv/Twitch-API/issues/133)
            limitParam = '&limit=' + (listContent.pageSize + 1);   // Setting a "limit" will give us a proper url in the response for the "next" page's elements

        return (searchString === 'undefined') ?
        BASE_URL + limitParam + callbackParam :
        BASE_URL + encodeURIComponent(' ' + searchString) + limitParam + callbackParam;
    }


    function searchForStreams(searchString) {

        var urlString = makeUrlStringFromSearchInput(searchString);

        return getJSONP(urlString).then(function (response) {

            debugger;

            var results = response.streams;

            if (results) {

                currentPage = 1; // reset to page 1

                // store current state of the list
                listContent.numStreams = response['_total'];
                listContent.totalPages = Math.ceil(listContent.numStreams / listContent.pageSize);

                // update UI with correct counts
                totalResultsCountElem.textContent = 'Total Results: ' + listContent.numStreams.toString();
                totalPagesElem.textContent = listContent.totalPages.toString();
                currentPageNumberElem.textContent = currentPage.toString();

                renderFirstPageAfterSearch(results);  // render results for the first page (this also becomes the first element in our in-memory list
                //makePageElementsAfterSearch(results.slice(listContent.pageSize));   // get to work on building our in-memory list for everything else
                completePageElementsAfterSearch(listContent.numStreams - listContent.pageSize, listContent.pageSize, response['_links'].next);   // Having computed our number of pages, keep grabbing data in for the next results in the background

            } else {
                reportNoMatch();  // TODO: Implement
            }

        }).catch(function (error) {
            // TODO: Handle any errors from the search operation
        });
    }


    function buildStreamElem(streamData) {

        var listElemContainer = document.createElement('div'),
            previewImageElem = document.createElement('img'),
            itemInfoContainer = document.createElement('div'),

            imageWidth = 160,
            imageHeight = 125;


        /////// Compose the pieces that will be appended to listElemInfoContainer ///////

        // Title
        var streamTitle = document.createElement('h2');
        streamTitle.textContent = streamData.channel['display_name'];

        // Subtitle
        var streamSubtitle = document.createElement('p');
        streamSubtitle.textContent = streamData.game + ' - ' + streamData.viewers + ' viewers';

        // Description
        var streamDescription = document.createElement('div');
        streamDescription.textContent = streamData.channel.status;


        itemInfoContainer.appendChild(streamTitle);
        itemInfoContainer.appendChild(streamSubtitle);
        itemInfoContainer.appendChild(streamDescription);


        //// Create the proper source string for our preview image and set it on the elem /////
        var imageSourceString = streamData.preview.template.replace(/\{width}/, imageWidth);
        imageSourceString = imageSourceString.replace(/\{height}/, imageHeight);

        previewImageElem.src = imageSourceString;


        ////// Compose the final list element out of the preview image and the info element
        listElemContainer.appendChild(previewImageElem);
        listElemContainer.appendChild(itemInfoContainer);

        return listElemContainer;
    }


    function bulidPageContainerElement(streams) {
        var listPageContainerElem = document.createElement('div');
        listPageContainerElem.classList.add('list-page-container');

        var streamElem;
        for (var i = 0, l = streams.length; i < l; i++) {
            streamElem = buildStreamElem(streams[i]);
            listPageContainerElem.appendChild(streamElem);
        }

        return listPageContainerElem;
    }

    /**
     * We want to be able to display the first page right away after a user searches,
     * so this method will take a page-sized slice of the results and render an initial element
     * to the DOM.
     */
    function renderFirstPageAfterSearch(streams) {

        var pageContainerElem = bulidPageContainerElement(streams);
        pageContainerElem.classList.add('current-page');

        // If this isn't our first return from a search query, we need to replace the
        // existing content
        if (streamListContainer.children.length > 0) {
            var newStreamListContainer = document.createElement('div');
            newStreamListContainer.classList.add('stream-list-container');
            streamListContainer.parentNode.replaceChild(newStreamListContainer, streamListContainer);

            // update the reference to the newly inserted node
            streamListContainer = newStreamListContainer;
            newStreamListContainer = null;
        }

        streamListContainer.appendChild(pageContainerElem);

        // set the element as the first element of our in-memory list that's tracking them
        listContent.pageElems = [];
        listContent.pageElems.push(pageContainerElem);
    }


    /**
     * Build a DOM element for a page that can then be efficiently indexed and displayed later
     */
    function makePageElementsAfterSearch(streams) {
        if ((!listContent.hasOwnProperty('pageElems')) ||
            (!Array.isArray(listContent.pageElems)) ||
            (listContent.pageElems.length === 0)) {

            // This should never be reached!
            throw new Error('No list exists upon which to add stream page elements. It should have already been created');
        } else {

            if (streams.length > listContent.pageSize) {

                // Correct for an edge case where this gets called with a number of streams
                // that is in excess of our page size
                streams.splice(listContent.pageSize);
            }

            var pageContainerElem = bulidPageContainerElement(streams);
            listContent.pageElems.push(pageContainerElem);
        }
    }


    function completePageElementsAfterSearch(numStreamsRemaining, pageSize, nextQuery) {
        if (numStreamsRemaining > 0) {
            getJSONP(nextQuery).then(function (results) {

                makePageElementsAfterSearch(results.streams);
                numStreamsRemaining -= pageSize;
                nextQuery = results['_links'].next;
                completePageElementsAfterSearch(numStreamsRemaining, pageSize, nextQuery);

            });
        }
    }


    /**
     * Flip from the current page to a new page based upon the corresponding
     * indices given.
     */
    function flipPage(oldPageIdx, newPageIdx, isDecrementing) {

        var currentPageElem = streamListContainer.children[oldPageIdx];

        if (currentPageElem === undefined) {
            throw new Error('flipPage: no current page found -- we shouldn\'t be executing this');
        }

        currentPageElem.classList.remove('current-page');

        // Apply class selectors to animate page-flip
        // TODO: CSS Animation?
        !!isDecrementing ?
            ( currentPageElem.classList.add('flipped-to-prev'), currentPageElem.classList.remove('flipped-to-next') ) :
            ( currentPageElem.classList.add('flipped-to-next'), currentPageElem.classList.remove('flipped-to-prev') );


        //////////////// Bring in the new hotness ////////////////
        var newPageElem;

        // If the DOM container already has the page element, we just need to make it visible
        // If not, we're appending it for the first time from our in-memory list.
        if (!(newPageElem = streamListContainer.children[newPageIdx])) {
            newPageElem = listContent.pageElems[newPageIdx];
        }

        newPageElem.classList.add('current-page');

        !!isDecrementing ?
            (newPageElem.classList.remove('flipped-to-current-from-prev'), newPageElem.classList.add('flipped-to-current-from-next') ) :
            (newPageElem.classList.remove('flipped-to-current-from-next'), newPageElem.classList.add('flipped-to-current-from-prev') );

        // TODO: CSS Animation for above "flipped-to-current" classing
        // QUESTION: Does the class need to be applied after DOM insertion to trigger the animation?

        streamListContainer.appendChild(newPageElem);

        // After EVERYTHING, update the page number to reflect the page that was just flipped to
        currentPageNumberElem.textContent = currentPage.toString();
    }


    function reportNoMatch() {
        console.log('Successful search operation, but no streams found');
    }


    /**
     * Triggered on click to "previous page" button
     */
    function decrementPage() {

        if (currentPage > 1) {

            var newPageIdx = (currentPage - 2);  // newPageIdx will be 2 less than "currentPage" (-1 b/c of decrement and -1 b/c of zero-basing)
            currentPage--;

            flipPage(newPageIdx + 1, newPageIdx, true);

            if (currentPage === 1) {
                prevPageButton.disabled = true;
                prevPageButton.classList.add('disabled');
            }

            if (!!nextPageButton.disabled) {
                nextPageButton.disabled = false;
                nextPageButton.classList.remove('disabled');  // QUESTION: Correct placement of class removal?
            }
        }
    }

    /**
     * Triggered by click to "next page" button
     */
    function incrementPage() {
        
        if (currentPage < listContent.totalPages) {

            var newPageIdx = currentPage;  // newPageIdx will match "currentPage" since it's zero-based
            currentPage++;

            flipPage(newPageIdx - 1, newPageIdx, false);

            if (currentPage === listContent.totalPages) {
                nextPageButton.disabled = true;
                nextPageButton.classList.add('disabled');
            }

            if (!!prevPageButton.disabled) {
                prevPageButton.disabled = false;
                prevPageButton.classList.remove('disabled');  // QUESTION: Correct placement of class removal?
            }
        }
    }
}
;
