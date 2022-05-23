/*

Implements React Routing in Plain React, without reliance
on React-Router or any other libraries.

To use:

In your top-level React Component (e.g. App or Index.js):

- Import Router (e.g.: import Router from './Router')
- Create a const with your routes and their associated component
- Create a const with the component to show on urls not routed (i.e. 404 page)
- Return a Router component as the top-level component of your App

Example: 

```function App() {
   ...
   const routes = [{path:"/", component:<Home/>}, {path:"/login", component:<Login/>}]
   ...
   const defaultComponent = <NoPageExists/>
   
   return (
      <Router routes={routes} defaultComponent={defaultComponent}/>
   )
}
```

Then to use routes:

- If you want to mimic the <a href> experience, use <Link/>, e.g.:
  <Link className="someClass" href="/login">
      Text or React Component
  </Link>

- If you want to add an onClick event handler to buttons etc. use
  the `navigate` function, e.g.:
  
  <Button variant="contained" onClick={(e) => navigate("/Register")} fullWidth>Register</Button>

- You need to import Link & Navigate to use them, e.g.:
import { Navigate, Link } from "./Components/AKRouter";


And that's it!

*/



/* Code Starts Here */

import React from 'react';
import { useEffect, useState } from 'react';

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

/* Use the below when you want the full hyperlink behaviour */

export function Link ({ className, href, children }) {

    const onClick = (event) => {
        // if ctrl or meta key are held on click, allow default behavior of opening link in new tab
        if (event.metaKey || event.ctrlKey) {
            return;
        }

        navigate(href);
    };

    return (
        <a className={className} href={href} onClick={onClick}>
            {children}
        </a>
    );
};
