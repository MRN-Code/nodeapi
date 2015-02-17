(function init(window, $, hawk) {
    // define global vars to keep linter happy
    var btoa = window.btoa;
    var document = window.document;
    var localStorage = window.localStorage;
    var alert = window.alert;

    // config
    var config = {
        credentialKey: 'hawkCredentials',
        maxRetries: 1
    };


    // static functions
    /**
     * display the data in the auth_results div in JSON form
     * @param {object|string} data - the data to be displayed.
     */
    var writeLog = function(data) {
        var responseDiv = document.getElementById('auth_results');
        responseDiv.innerHTML += '<li>' + JSON.stringify(data); + '<li>';
    };


    /**
     * selectively hide or display the login form and logout buttons
     */
    var updateLoginForm = function() {
        var loginForm = document.querySelector('form');
        var logoutButton = document.getElementById('logout');
        if (localStorage.getItem(config.credentialKey)) {
            loginForm.className = 'hidden';
            logoutButton.className = '';
        } else {
            loginForm.className = '';
            logoutButton.className = 'hidden';
        }
    };


    /**
     * retrieve hawk credentials from server
     * Note that because we use standard HTTP Basic authentication
     *   if the wrong username and password are supplied
     *   to the server, the browser will automatically show
     *   its own login popup. There is no way around this except using
     *   a custom authentication scheme that the browser does not recognise
     *   This could be easily achieved by modifying the hapi-auth-basic plugin
     *   to register a 'BasicCustom' authentication scheme instead.
     * @param {string} username - the users username
     * @param {string} password - the users password
     */
    var login = function(username, password) {
        // helper function to set auth header
        var setHeaders = function(xhr) {
            var token = btoa(username + ':' + password);
            xhr.setRequestHeader('Authorization', 'Basic ' + token);    
        };

        // send request
        $.ajax({
            method:"GET",
            url: '/login',
            beforeSend: setHeaders
        }).done(function(data) {
            if (data.id && data.key && data.algorithm) {
                // add credentials to localstorage
                localStorage.setItem(config.credentialKey, JSON.stringify(data));
                writeLog('Hawk credentials retrieved and written to localStorage');
                updateLoginForm();
            } else {
                writeLog('Login attempt failed: unrecognized response: ' + JSON.stringify(data));
                throw new Error('Unrecognized response from server');
            }
        }).fail(function(jqxhr, err){
           writeLog('Login attempt failed: ' + err);
           throw new Error(err);
        });
    };


    /**
     * remove the user's credentials from local storage.
     */
    var logout = function() {
        localStorage.removeItem(config.credentialKey);
        writeLog('Logout: removed hawk credentials from localStorage');
        updateLoginForm();
    };


    /**
     * send secure hauk-signed request to our API
     * in the event that the browser and server clocks are out of sync,
     *   re-send the request after hawk has adjusted its internal skew
     * @param {object} options - object containing request parameters:
     *   options.type (default 'GET') optional
     *   options.path (required) path of the secure resouce
     *   options.retryCount internally maintiained counter to limit retries
     */  
    var apiRequest = function(options) {
        // set option defaults
        options.type = options.type || 'GET';
        options.retryCount = options.retryCount || 0;
        
        // declare vars
        var xhr; //pointer to xhr object, since jQuery makes is difficult to get to
        var hostname = window.location.host;
        var url, credentials, header, validResponse;

        // build url
        url = 'http://' + hostname + '/' + options.path;
        // retrieve hawk credentials
        credentials = JSON.parse(localStorage.getItem(config.credentialKey));
        // generate header for request
        header = hawk.client.header( url, options.type, {credentials: credentials});
        // check header for errors
        if (header.err) {
            writeLog('Could not generate hawk auth header: ' + header.err);
            throw new Error(header.err);
        }

        // helper functions
        var validateResponse = function() {
            validResponse = hawk.client.authenticate(xhr, credentials, header.artifacts, {payload: xhr.responseText}); 
        };

        if (options.retryCount > config.maxRetries) {
            throw new Error('maximum number of retries exceeded');
        }

        // send request
        $.ajax({
            method: options.type,
            url: url,
            beforeSend: function($xhr) {
                // set xhr in closure scope
                xhr = $xhr; 
                // set authorization header
                $xhr.setRequestHeader('Authorization', header.field);
            }
        })
            // always validate the response
            .always(validateResponse)
            .fail(function(jqxhr, msg, err) {
                if (jqxhr.responseJSON && validResponse) {
                    if (jqxhr.responseJSON.message === "Stale timestamp") {
                        // Server time is more than two minutes off from browser-time, 
                        // hawk.client.authenticate will automatically store a skew vaue
                        // and adjust future requests so that the times are in sync
                        // Try regenerating header and resending
                        options.retryCount ++;
                        writeLog('Stale timestamp. retrying: ' + jqxhr.responseJSON);
                        return apiRequest(options);
                    } else if (jqxhr.responseJSON.statusCode === 401) {
                        alert('Your credentials are invalid. Logging you out');
                        writeLog('Invalid credentials. logging out: ' + jqxhr.responseJSON);
                        logout();
                        return false;
                    }
                }
                //otherwise, just throw the error
                throw err;
            })
            .done(function(data, msg, jqxhr) {
                if (validResponse) {
                    writeLog('Success: ' + data);
                } else {
                    writeLog('Invalid Response: ' + data);
                }
            });
    };


    // when page is loaded, bind form elements to the above functions
    document.addEventListener('DOMContentLoaded', function(evt) {
        var loginForm = document.querySelector('form');
        var logoutButton = document.getElementById('logout');
        var testButton = document.getElementById('test_auth');
        // Bind to form element events
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();

            var username = document.querySelector('[name=username]').value;
            var password = document.querySelector('[name=password]').value;

            login(username, password);

            return false;
        });

        logoutButton.addEventListener('click', logout);
        
        testButton.addEventListener('click', function(event) {
            apiRequest({path: 'restricted'});
        });

        // update login form to display login - state
        updateLoginForm();
    });
})(window, $, hawk);
