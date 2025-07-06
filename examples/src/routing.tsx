import { createElement, createRouter, Link } from 'cytoplasmic'

function RoutingNav() {
    return <div class='flex-row gap'>
        <div>Menu:</div>
        <Link path=''><a>Dashboard</a></Link>
        <Link path='users'><a>Users</a></Link>
        <Link path='lazy'><a>Lazy</a></Link>
    </div>;
}

function RoutingDashboard() {
    return <div>
        <h3>Dashboard</h3>
        <p>Welcome to the routing example</p>
    </div>;
}

function RoutingUsers() {
    return <div>
        <h3>Users</h3>
        <div>
            <Link path='./1'><a>User 1</a></Link>
        </div>
        <div>
            <Link path='/users/2'><a>User 2</a></Link>
        </div>
    </div>;
}

function RoutingUser({userId}: {userId: string}) {
    return <div>
        <h3>User {userId}</h3>
        <p>Details for user {userId}</p>
        <p><Link path='./subroutes'><a>Subroutes</a></Link></p>
        <p><Link path='..'><a>Back</a></Link></p>
    </div>;
}

function RoutingNotFound() {
    return <div>
        <h3>Page not found</h3>
    </div>;
}

async function loadLazyRoute() {
    const m = await import('./lazy-route');
    await new Promise(resolve => setTimeout(resolve, 500));
    return <m.LazyRoute/>;
}

function SubroutingMain() {
    return <div>
        <h3>Main</h3>
        <Link path='page'><a>page</a></Link>
    </div>;
}

function SubroutingSubpage() {
    return <div>
        <h3>Page</h3>
    </div>;
}

function SubroutingNotFound() {
    return <div>
        <h3>Subpage not found</h3>
    </div>;
}

function SubroutingExample({userId}: {userId: string}) {
    const router = createRouter({
        '': () => <SubroutingMain/>,
        'page': () => <SubroutingSubpage/>,
        '**': () => <SubroutingNotFound/>,
    }, 'path');
    return <div>
        <h3>Subrouting</h3>
        <router.Provider>
            <div class='flex-row gap'>
                <Link path=''><a>Main</a></Link>
                <Link path='page'><a>page</a></Link>
                <Link path={`/users/${userId}`}><a>back</a></Link>
            </div>
        </router.Provider>
        <router.Portal/>
    </div>
}

export function RoutingExample() {
    const router = createRouter({
        '': () => <RoutingDashboard/>,
        'users': {
            '': () => <RoutingUsers/>,
            '*': userId => ({
                '': () => <RoutingUser userId={userId}/>,
                'subroutes': {
                    '**': () => <SubroutingExample userId={userId}/>,
                },
            }),
        },
        'lazy': () => loadLazyRoute(),
        '**': () => <RoutingNotFound/>,
    }, 'path');
    return <div class='flex-column gap'>
        <router.Provider>
            <RoutingNav/>
        </router.Provider>
        <router.Portal/>
    </div>;
}
