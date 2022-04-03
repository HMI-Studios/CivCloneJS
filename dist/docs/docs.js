function openNav() {
  document.getElementById('sidebar').classList.add('sidebar-open');
  document.getElementById('root').classList.add('sidebar-open');

  const collection = document.getElementsByClassName('header');
  for (let i = 0; i < collection.length; i++) {
    console.log(collection[i]);
    collection[i].classList.add('sidebar-open');
  }
}
  
function closeNav() {
  document.getElementById('sidebar').classList.remove('sidebar-open');
  document.getElementById('root').classList.remove('sidebar-open');

  const collection = document.getElementsByClassName('header');
  for (let i = 0; i < collection.length; i++) {
    collection[i].classList.remove('sidebar-open');
  }
}

function expandMenu(menuID) {
  const div = document.getElementById('submenu:' + menuID)

  if (div.style.maxHeight){
    div.style.maxHeight = null;
  } else {
    div.style.maxHeight = div.scrollHeight + 'px';
  }
}

const events = {
  actions: {
    setPlayer: [ ['username: string'], 'Sets the username for the current connection.' ],
    joinGame: [ ['gameID: number'], 'Tries to add the current connection to the game with ID `gameID`. Responds with `civID` and `colorPool` updates if successful; with `kicked` error if unsuccessful.' ],
    getGames: [ [], 'Responds with a `gameList` update.' ],
    setColor: [ ['color: string'], 'Sets the color of the civilization controlled by the current connection to `color`. Responds with `colorPool` update if successful; with `colorTaken` error if unsuccessful.' ],
    ready: [ ['state: boolean'], '' ],
    moveUnit: [ ['src: Coords', 'path: Coords[]'], 'Moves unit at `src` along `path`. Returns early if a move is invalid.' ],
    endTurn: [ [], '' ],
  },
  update: {
    civID: [ [ 'civID: number' ], '' ],
    colorPool: [ [ 'colors: string[]' ], '' ],
    gameList: [ [ 'gameIDs: number[]' ], '' ],
    beginGame: [ [ '[width: number, height: number]', 'playerCount: number' ], '' ],
    civData: [ [ 'civData: { [civID: number]: CivilizationData }' ], '' ],
    setMap: [ [ 'tiles: (TileData | null)[]' ], '' ],
    beginTurn: [ [], '' ],
    tileUpdate: [ [ 'coords: Coords', 'tile: TileData | null' ], '' ],
  },
  error: {
    kicked: [ [ 'reason: string' ], '' ],
    colorTaken: [ [ 'reason: string' ], '' ],
    notReady: [ [ 'reason: string' ], '' ],
  },
};

const sidebar = document.getElementById('sidebar');

for (const headTitle in events) {
  const div = document.createElement('div');
  div.className = 'sidebar-div';

  const link = document.createElement('a');
  link.href = '#' + headTitle;
  link.innerHTML = headTitle;
  link.className = 'sidebar-btn';

  const expandBtn = document.createElement('button');
  expandBtn.innerHTML = '+'
  expandBtn.type = 'button';
  expandBtn.className = 'expand-btn';
  expandBtn.onclick = function() { expandMenu(headTitle); };

  div.appendChild(link);
  div.appendChild(expandBtn);

  const subMenu = document.createElement('div');
  subMenu.className = 'submenu';
  subMenu.id = 'submenu:' + headTitle;

  for (const eventName in events[headTitle]) {
    const eventLink = document.createElement('a');
    eventLink.href = '#' + headTitle + ":" + eventName;
    eventLink.innerHTML = eventName;
    eventLink.className = 'submenu-btn';

    subMenu.appendChild(eventLink);
  }

  sidebar.appendChild(div);
  sidebar.appendChild(subMenu);
}

const root = document.getElementById('root');

for (const headTitle in events) {
  const anchor = document.createElement('a');
  anchor.name = headTitle;

  const head = document.createElement('h2');
  head.className = 'header';
  head.innerText = headTitle;

  anchor.appendChild(head);
  root.appendChild(anchor);

  const groupDiv = document.createElement('div');

  for (const eventName in events[headTitle]) {
    const eventData = events[headTitle][eventName];

    const eventAnchor = document.createElement('a');
    eventAnchor.name = headTitle + ":" + eventName;
 
    const eventHead = document.createElement('h3');
    eventHead.innerText = eventName;

    const eventElement = document.createElement('code');
    eventElement.className = 'code language-ts';

    const eventText = document.createElement('p');
    eventText.innerText = eventData[1]//.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    eventElement.innerHTML = `{
  ${headTitle}: [
    [${eventName}, [${eventData[0].join(', ')}]]
  ]
}`;
    
    eventAnchor.appendChild(eventHead);
    groupDiv.appendChild(eventAnchor);
    groupDiv.appendChild(eventText);

    const preWrapper = document.createElement('pre');
    preWrapper.appendChild(eventElement);
    groupDiv.appendChild(preWrapper);
  }

  root.appendChild(groupDiv);
}
