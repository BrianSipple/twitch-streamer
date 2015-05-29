window.onload = function () {


    var resultsListContainer = document.querySelector('.results-list-container'),
        mainViewContainer = document.querySelector('.main-view-container'),
        totalResultsCountElem = document.querySelector('.results-count'),
        searchInput = document.querySelector('.search-input'),
        searchSubmit = document.querySelector('#searchSubmit'),
        errorDialog = document.querySelector('.error-dialog'),
        streamListContainer = document.querySelector('stream-list-container'),
        prevPageButton = document.querySelector('.page-nav.prev'),
        nextPageButton = document.querySelector('.page-nav.next'),
        currentPage = 0,
        isSearching = false;

    var listContent = {
        pageSize: 5,  // initialize a default page size
        totalPages: 1,
        steams: undefined  // FILL here with data necessary for rendering the search results
    };

    searchSubmit.addEventListener('click', handleSearchSubmit);

    prevPageButton.addEventListener('click', decrementPage);
    nextPageButton.addEventListener('click', incrementPage);



    function handleSearchSubmit() {

        var searchString = searchInput.value;

        if (searchString === undefined) {
            // Respond to user when button is clicked without a search term
        } else if (!isSearching) {

            isSearching = true;
            searchSubmit.classList.add('disabled');

            searchForStreams(searchString);
        }
    }


    /**
     * Return a new Promise based upon sending an XHR request for data
     * to the given url
     */
    function get(url) {

        return new Promise(function (resolve, reject) {

            var req = new XMLHttpRequest();
            req.open('GET', url);

            req.onload = function () {

                // onload is called even on a 404, so check the status
                if (req.status === 200) {
                    resolve(req.response);

                } else {
                    // Otherwise reject with the status text
                    // which will hopefully be a meaningful error
                    reject(Error(req.statusText));
                }
            };

            // Account for any networking errors that might occur
            req.onerror = function () {
                reject(Error('Network Error'));
            };

            // Here we go!
            req.send();
        });
    }


    function getJSON(url) {
        return get(url).then(JSON.parse);
    }


    function searchForStreams(searchString) {

        var url = makeUrlFromSearchString(searchString);

        return getJSON(url).then(function (response) {

            // Handle successful return of the search
            isSearching = false;
            searchSubmit.classList.remove('disabled');

            var results = response.streams;

            if (results) {
                listContent.streams = results;  // store results
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
    function renderStreams (streams) {

    }


    function reportNoMatch () {

    }



    function decrementPage () {

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

    function incrementPage () {

        if (currentPage < listContent.totalPages) {

            currentPage++;

            var startIndex = (currentPage - 1) * listContent.pageSize,
                streamsToRender = listContent.streams.slice(startIndex, startIndex + listContent.pageSize);

            renderStreams(streamsToRender);

            if (currentPage === listContent.totalPages) {
                nextPageButton.classList.add('disabled');
            }

            prevPageButton.classList.remove('disabled');  // QUESTION: Correct placement of class removal?


        }
    }





};
