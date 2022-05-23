/*

Implements React Routing in Plain React, without reliance on React-Router or any other libraries.

To use:

In your top-level React Component (e.g. App or Index.js):

- Import Router (e.g.: import Router from './Router')
- Create a const with your routes and their associated component
- Create a const with the component to show on urls not routed (i.e. 404 page)
- Return a Router component as the top-level component of your App

Example:

```function App() {
   ...
   const routes = [{path:"/", component:<Home/>}, {path:"/register", component:<Register/>}]
   ...
   const defaultComponent = <NoPageExists/>

   return (
      <Router routes={routes} defaultComponent={defaultComponent}/>
   )
}
```

Then to use routes:

- Use <a href> as you would normally do, e.g. <a href="/register">Register</a>

- If you want to add an onClick event handler to buttons etc. use the `navigate` function, e.g.:

  <Button onClick={(e) => navigate("/register")} fullWidth>Register</Button>

And that's it!

*/


/* Code Starts Here */

import React from 'react';
import { useEffect, useState } from 'react';

// Global Event Listener on "click"
// Credit Chris Morgan: https://news.ycombinator.com/item?id=31373486
window.addEventListener("click", function (event) {
    // Only run this code when an <a> link is clicked
    const link = event.target.closest("a");
    // Correctly handle clicks to external sites and
    // modifier keys
    if (
        !event.button &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        link &&
        link.href.startsWith(window.location.origin + "/") &&
        link.target !== "_blank"
    ) {
        // prevent full page reload
        event.preventDefault();
        // Main routing function
        navigate(link.href);
    }
});

/* Main Component */

export default function Router ({routes, defaultComponent}) {

    // state to track URL and force component to re-render on change
    const [currentPath, setCurrentPath] = useState(window.location.pathname);

    useEffect(() => {
        // define callback as separate function so it can be removed later with cleanup function
        const onLocationChange = () => {
            // update path state to current window URL
            setCurrentPath(window.location.pathname);
        }

        // listen for popstate event
        window.addEventListener('popstate', onLocationChange);

        // clean up event listener
        return () => {
            window.removeEventListener('popstate', onLocationChange)
        };
    }, [])
    return routes.find(({path, component}) => path === currentPath)?.component || defaultComponent
}

/* Use the below in buttons and programmatically to navigate to pages */

export function navigate (href) {

    // update url
    window.history.pushState({}, "", href);

    // communicate to Routes that URL has changed
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
}
