# hapi-cookie-auth example

Sample project configured to use hapi-auth-cookie. Made in preparation to [update](https://github.com/hapijs/university/issues/193) 
[hapijs/university assignment7](https://github.com/hapijs/university/blob/master/guides/contents.md) to hapi v13.x.x, hapi-auth-cookie v6.x.x using ES6 code. 
Should help those trying to configure a project to use hapi-auth-cookie with glue composing the server.
Project implements most of the hapi-cookie-auth [example](https://github.com/hapijs/hapi-auth-cookie/blob/master/example/index.js) application, but adds glue.


### glue 
 * project uses [glue](https://github.com/hapijs/glue) to compose the server. 
 * glue uses a JSON object called a manifest document. The manifest declares all plugins to 
   be loaded when the server starts (composes). The manifest document used to compose
   the server for tests is declared at the bottom of each test file. 

### register auth plugin
 * ./lib/cookie-auth.js
 * registers hapi-auth-cookie plugin for the project.
   - sets default strategy of hapi-auth-cookie to all routes.
   - password at least 32 chars in length.
   - redirects to GET /login.
   - isSecure: true
 * all routes have strategy named **session** applied as default auth strategy.

### 100% test coverage
All sample code has test coverage.

### routes
 * GET /auth 
   proves hapi-auth-cookie is working. 
   But, turns redirect off.  

 * GET /restricted  
   user must be authenticated to access restricted route.  
   Note: no scopes configured yet.

 * POST /login  
   resource point which upon successful authorization returns  
   sid-example cookie with the authorization value created by hapi-auth-cookie
   in the response headers.
   - see ./test/resources.js and test/cookie-auth.js

### dependencies after example
project uses glue to load plugins and server.dependency(dependency, after) logic
to ensure depencies are loaded before a plugin loads that depends on them.
server.dependency('hapi-auth-cookie', internals.after);
  * examples of dependencies after usage:
    - ./lib/cookie-auth.js
    - ./lib/resources.js

### To inspect code:
`git clone https://github.com/zoe-1/cookie-auth` <br/> 
`npm install`<br/>
`npm test`<br/>
Read the tests code, that is where all the action is at.

