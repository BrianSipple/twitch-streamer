window.onload = function () {


    var BASE_URL = 'https://api.twitch.tv/kraken/search/streams?q=',
        NETWORK_TIMEOUT_THRESHOLD = 7500,   // max amount of time for network requests before throwing an error

    //////////////// Wire up some initial references to DOM elements that we'll be manipulating ////////////////
        mainViewContainer = document.querySelector('.main-view-container'),
        totalResultsCountElem = document.querySelector('.results-count-container'),
        currentQueryNameElem = document.querySelector('.current-query-name'),
        welcomeMessageElem = document.querySelector('.welcome-message'),

    // Search input references
        searchInput = document.querySelector('#searchInput'),
        searchSubmitButton = document.querySelector('#searchSubmit'),
        searchForm = document.querySelector('#searchForm'),
        errorDialogContainer = document.querySelector('.global-dialog-container'),
        errorDialogElem = errorDialogContainer.querySelector('.global-dialog.error'),
        errorMessageElem = errorDialogElem.querySelector('.message'),


    // Stream List references
        streamListContainer = document.querySelector('.stream-list-container'),


    // Page nav references
        listHeaderElem = document.querySelector('.list-header'),
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

        /**
         * Helper for setting a JSONP callback when making API requests
         * (Currently, JSON_P needs to be used with the Twitch API (https://github.com/justintv/Twitch-API/issues/133)
         *
         * The loadJSONP variable will now be a reference to an IIFE, which takes the following params:
         *
         * @param url -- the fully formatted url with which to make an HTTP request
         * @param callback --
         * @param opt_context -- an optional context to bind to when executing the callback
         */
        loadJSONP = (function loadJSONP() {

            var callCount = 0;   // increment so that every call creates a unique callback reference.

            return function (url, callback, opt_context) {
                // INIT
                var name = '_jsonp_' + callCount++;   // make a unique name for the JSONP callback

                // First, check whether a url has already been fully made EXCEPT for the
                // necessary callback parameter
                if (url.match(/callback=/)) {
                    url = url.replace(/callback=/, 'callback=' + name);

                    // At least try to make sure we have a proper query string adding the "&callback" param
                } else if (url.match(/\?/)) {
                    url += '&callback=' + name;
                }

                // create the script
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = url;


                //////// Dynamically setup the handler as a temporary window property  ///////

                // Make sure we aren't accidentally clashing with another property, if so, store the current
                // value away and replace it later
                var temp;
                if (window[name]) {
                    temp = window[name];
                }

                window[name] = function (data) {

                    // Execute the callback
                    callback.call((opt_context || window), data);

                    // cleanup
                    document.querySelector('head').removeChild(script);
                    script = null;
                    delete window[name];

                    // restore old prop if necessary
                    if (temp) {
                        window[name] = temp;
                    }
                };

                // Load ze JSON
                document.querySelector('head').appendChild(script);
            };
        }());

    //////////////// Event listeners ////////////////
    searchForm.addEventListener('submit', handleSearchSubmit);
    prevPageButton.addEventListener('click', decrementPage);
    nextPageButton.addEventListener('click', incrementPage);

    errorDialogElem.querySelector('.button-primary').addEventListener('mouseup', function () {
        errorDialogElem.classList.remove('show');
        errorDialogElem.classList.add('hide');
        errorDialogContainer.style.backgroundColor = 'transparent';
        errorDialogContainer.style.zIndex = '0';
        enableSearch();
    });


    function handleSearchSubmit(e) {

        e.preventDefault();  // prevent default form action -- we'll take it from here

        var searchString = this.searchInput.value;

        if (!isSearching) {

            isSearching = true;
            searchSubmitButton.classList.add('disabled');
            searchSubmitButton.disabled = true;
            listHeaderElem.style.opacity = 0;  // will reappear with newly computed results after download

            // We won't be needing this anymore
            welcomeMessageElem.style.opacity = 0;
            welcomeMessageElem.style.zIndex = -1;

            return getAllStreams(searchString).then(function (resp) {
                enableSearch();
                enableNav()
            })
                .catch(function (err) {

                    // Handle anything that gets thrown here.
                    // For now, we'll make sure that the throwable gets logged to the console.
                    console.log.call(console, err);
                    showGeneralErrorDialog(err);
                });
        }
    }

    /**
     * Return a new Promise based upon sending an XHR request for data
     * to the given url
     */
    function getJSONP(url) {

        return new Promise(function (resolve, reject) {

            var networkTimeout = setTimeout(function () {
                reject()
            }, NETWORK_TIMEOUT_THRESHOLD);

            loadJSONP(url, function (data) {
                if (data) {
                    clearTimeout(networkTimeout);
                    resolve(data);

                } else {
                    reject();
                }
            });
        });
    }


    /**
     * Encode a proper url query string based upon the search text that the
     * user has provided.
     *
     * In addition to encoding the input text, we also need to decorate the URL
     * with a proper limit parameter, and ensure that it's ready to have a callback
     * function appended to it (see loadJSONP function)
     */
    function makeUrlStringFromSearchInput(searchString) {

        var callbackParam = '&callback=',   // Currently, JSON_P needs to be used with the Twitch API (https://github.com/justintv/Twitch-API/issues/133)
            limitParam = '&limit=' + (listContent.pageSize + 1);  // Setting a "limit" will give us a proper url in the response for the "next" page's elements

        return (searchString === 'undefined') ?
        BASE_URL + limitParam + callbackParam :
        BASE_URL + encodeURIComponent(searchString) + limitParam + callbackParam;
    }


    function getAllStreams(searchString) {

        var urlString = makeUrlStringFromSearchInput(searchString);

        return getJSONP(urlString).then(function (response) {

            var results = response.streams;


            if (results && response['_total'] > 0) {

                currentPage = 1; // reset to page 1

                // store current state of the list
                listContent.numStreams = response['_total'];
                listContent.totalPages = Math.ceil(listContent.numStreams / listContent.pageSize);

                // update UI with correct counts
                totalResultsCountElem.textContent = 'Total Results: ' + listContent.numStreams.toString();
                currentQueryNameElem.textContent = 'Current Search: "' + searchString + '"';
                totalPagesElem.textContent = listContent.totalPages.toString();
                currentPageNumberElem.textContent = currentPage.toString();

                renderFirstPageAfterSearch(results);  // render results for the first page (this also becomes the first element in our in-memory list
                completePageElementsAfterSearch(listContent.numStreams - listContent.pageSize, listContent.pageSize, response['_links'].next);   // Having computed our number of pages, keep grabbing data in for the next results in the background

            } else {
                showNoneFoundDialog(searchString);
            }
        });
    }

    /**
     * After the dialog is correcly configured, this is called to animate it into view.
     */
    function activateDialog () {
        errorDialogContainer.style.backgroundColor = 'hsla(0, 0%, 0%, 0.5)';
        errorDialogContainer.style.zIndex = '40';

        errorDialogElem.classList.remove('hide');
        errorDialogElem.classList.add('show');
    }

    /**
     * Prepare a message to indicate that no matches were found for the user's query.
     */
    function showNoneFoundDialog (searchString) {

        // Set the dialog message
        errorMessageElem.textContent = 'No streams were found corresponding to the query\n' +
            '"' + searchString + '"\n' +
            'Please enter a new query and try again';

        // Bring it into view
        activateDialog();
    }

    /**
     * Prepare a message to indicate that something went wrong on our end during the query
     */
    function showGeneralErrorDialog (err) {

        // Set the dialog message
        errorMessageElem.textContent = 'Something went wrong while attempting to perform the search\n' +
        'Please try refreshing the page and searching again.';

        // Bring it into view
        activateDialog();
    }

    function enableSearch () {
        isSearching = false;
        searchSubmitButton.classList.remove('disabled');
        searchSubmitButton.disabled = false;
    }

    function enableNav () {
        nextPageButton.classList.remove('disabled');
        prevPageButton.classList.remove('disabled');
    }


    //////////////////////////////////////////////////////////////////////
    // DOM MANIPULATION STUFF....
    //////////////////////////////////////////////////////////////////////

    /**
     * For each "stream" result that the API returns, we can use its content
     * to dynamically create the right DOM element for the list
     */
    function buildListItemContainerElem(streamData) {

        var listItemContainerElem = document.createElement('div'),
            thumbnailImageContainer = document.createElement('div'),
            thumbnailImageElem = document.createElement('img'),
            itemInfoContainer = document.createElement('div'),

            imageWidth = 130,
            imageHeight = 90;


        /////// Compose the pieces of the list item info container ///////

        // Title
        var streamTitle = document.createElement('h2');
        streamTitle.textContent = streamData.channel['display_name'];

        // Subtitle
        var streamSubtitle = document.createElement('div');
        streamSubtitle.innerHTML = streamData.game +
            ' - <span class="accentuated">' + streamData.viewers + ' viewers</span>'; // highlight the viewer count

        // Description
        var streamDescriptionContainer = document.createElement('p'),
            streamDescription = document.createElement('span'),
            ellipsis = document.createElement('span'),          // This shows an ellipsis ONLY if the text overflows...
            ellipsisFill = document.createElement('span');     // ...because this patches up the empty space if it doesn't

        streamDescriptionContainer.className = 'multi-line-clamp clamp-2';
        streamDescription.className = 'text';
        streamDescription.textContent = streamData.channel.status;

        ellipsis.className = 'ellipsis';
        ellipsis.innerHTML = '&#133;';
        ellipsisFill.className = 'fill';

        streamDescription.appendChild(ellipsis);
        streamDescription.appendChild(ellipsisFill);
        streamDescriptionContainer.appendChild(streamDescription);

        itemInfoContainer.appendChild(streamTitle);
        itemInfoContainer.appendChild(streamSubtitle);
        itemInfoContainer.appendChild(streamDescriptionContainer);
        itemInfoContainer.classList.add('item-info-container');


        ///////////////// Compose the pieces of the thumbnail container ////////

        //// Create the proper source string for our preview image and set it on the elem /////
        var imageSourceString = streamData.preview.template.replace(/\{width}/, imageWidth);
        imageSourceString = imageSourceString.replace(/\{height}/, imageHeight);

        thumbnailImageElem.src = imageSourceString;
        thumbnailImageContainer.appendChild(thumbnailImageElem);
        thumbnailImageContainer.classList.add('thumbnail-container');


        ////// Compose the final list element out of the preview image and the info element
        listItemContainerElem.appendChild(thumbnailImageContainer);
        listItemContainerElem.appendChild(itemInfoContainer);
        listItemContainerElem.classList.add('list-item-container');

        return listItemContainerElem;
    }


    function buildPageContainerElement(streams) {
        var listPageContainerElem = document.createElement('div');
        listPageContainerElem.classList.add('list-page-container');

        var streamElem;
        for (var i = 0, l = streams.length; i < l; i++) {
            streamElem = buildListItemContainerElem(streams[i]);
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

        var pageContainerElem = buildPageContainerElement(streams);
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
        pageContainerElem.classList.add('new-results-rendering');
        listHeaderElem.style.opacity = 1;
        prevPageButton.classList.add('disabled');


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

            var pageContainerElem = buildPageContainerElement(streams);
            listContent.pageElems.push(pageContainerElem);
        }
    }


    /**
     * Recursive function that operates in the background after we get a response and have
     * already rendered the first page. This builds up future page elements that can then be
     * flipped to later.
     */
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


        // Apply class hook to animate page-flip
        // If decrementing, set a class hook to indicate that we're flipping to the previous page.
        // If incrementing, set a class hook to indicate that we're flipping to the next page
        if (isDecrementing) {
            currentPageElem.className = 'list-page-container flipped-to-next';
            prevPageButton.classList.add('disabled');
        } else {
            currentPageElem.className = 'list-page-container flipped-to-prev';
            nextPageButton.classList.add('disabled');
        }


        //////////////// Bring in the new hotness ////////////////
        var newPageElem,
            appending = false;

        try {

            // If the DOM container already has the page element, we just need to make it visible
            // If not, we're appending it for the first time from our in-memory list.
            if (!(newPageElem = streamListContainer.children[newPageIdx])) {
                appending = true;
                if (!(newPageElem = listContent.pageElems[newPageIdx])) {
                    // If we get here, it means that the page simply hasn't been built yet. I only noticed this
                    // issue when rapidly trying to flip through the results after they returned.
                    // After implementing this initial solution, the current state of the paging is maintained
                    // and the user only notices a brief "no-op"... as opposed to everything going blank and going out of sync.
                    throw new PageNotReadyError();
                }
            }

            // Apply a class hook to animate the appearance
            // The hook should distinguish between the page being reached via decrement or increment
            // NOTE: At this stage, if we're incrementing and we couldn't find the new element in the operation above,
            // it means we need to be APPENDING a new element from our in-memory list. If we're
            // decrementing, we just need to update the class name to trigger the animation, and otherwise leave the nodes as they are
            if (isDecrementing) {
                newPageElem.className = 'list-page-container current-page decremented-to';
            } else {
                newPageElem.className = 'list-page-container current-page incremented-to';
                if (appending) {
                    streamListContainer.appendChild(newPageElem);
                }
            }

            // After EVERYTHING, update the page number to reflect the page that was just flipped to
            // ...and enable the button again (if more pages can be flipped to in the same directions
            if (isDecrementing) {
                currentPage--;
                if (currentPage > 1) {
                    prevPageButton.classList.remove('disabled');
                }

            } else {
                currentPage++;
                if (currentPage < listContent.totalPages) {
                    nextPageButton.classList.remove('disabled');
                }
            }
            currentPageNumberElem.textContent = currentPage.toString();


        } catch (err) {
            if (err instanceof PageNotReadyError) {

                // Don't change the current page number -- just re-enable whichever button was disabled
                prevPageButton.classList.remove('disabled');
                nextPageButton.classList.remove('disabled');  // QUESTION: Is it cheaper not to even check what state we're in here? It seems like the DOM API is pretty good at just deleting the class if it's there and saying whatever if it't not.

            } else {
                throw new Error('unknown error during page flip');
            }
        }
    }

    /**
     * Triggered on click to "previous page" button
     */
    function decrementPage() {

        if (currentPage > 1) {

            var newPageIdx = (currentPage - 2);  // newPageIdx will be 2 less than "currentPage" (-1 b/c of decrement and -1 b/c of zero-basing)

            flipPage(newPageIdx + 1, newPageIdx, true);
            nextPageButton.classList.remove('disabled');
        }
    }

    /**
     * Triggered by click to "next page" button
     */
    function incrementPage() {

        if (currentPage < listContent.totalPages) {

            var newPageIdx = currentPage;  // newPageIdx will match "currentPage" since it's zero-based

            flipPage(newPageIdx - 1, newPageIdx, false);
            prevPageButton.classList.remove('disabled');

        }
    }

    /**
     * Helper "class" for detecting page-not-ready errors in our paging try block
     */
    function PageNotReadyError (msg) {
        this.msg = msg;
    }
};

