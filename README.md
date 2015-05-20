# nodeapi
node based API for COINS

# Design Specifications

## Endpoints

### [GET] /users 


### [GET, PUT, POST, DELETE] /users/{username}

### [GET, POST] /authKeys
* GET
  * Shall reject with a 400 Bad Request if a query parameter `username` is not supplied
  * Shall reject with a 403 Forbidden if the request was made using a *long term key*
  * Shall reply with a list of authorization keys if the query parameter username is supplied
* POST
  * Shall reject with a 403 Forbidden if the request was made using a *long term key*
  * Shall reject if a username is not specified in the POST body
  * Shall attempt generate a new auth key and store it in the auth key store, and reply with the Auth Key that was generated.
  * The default key generated should be a short-term key with an expiration date 30 minutes from current time.
  * The default

### [GET, DELETE]/authKeys/{keyId}
  * GET
    * Shall reject with a 403 Forbidden if the request was made using a *long term key*
    * Shall reject with a 403 Forbidden if authKey does not belong to the user making the request
    * Shall respond with a 200 and the metadata comprising the auth key 
  * DELETE
    * Shall reject with a 403 Forbidden if the request was made using a *long term key*
    * Shall reject with a 403 Forbidden if authKey does not belong to the user making the request and 
      if the user is not an administrator at the key-ownwer's site
    * Shall attempt to delete the key and will respond with the metadata of the deleted key
    
    
