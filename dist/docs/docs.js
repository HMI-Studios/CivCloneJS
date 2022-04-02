function openNav() {
    document.getElementById("mySidebar").style.width = "250px";
    document.getElementById("root").style.marginLeft = "250px";
  }
  
  function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
    document.getElementById("root").style.marginLeft = "px";
  }

const events = {
  actions: {
    setPlayer: [ ['username: string'], '' ],
    joinGame: [ ['gameID: number'], '' ],
    getGames: [ [], '' ],
    setColor: [ ['color: string'], '' ],
    ready: [ ['state: boolean'], 'Triggers `gameList` update.' ],
    moveUnit: [ ['srcCoords: Coords', 'dstCoords: Coords'], '' ],
    endTurn: [ [], '' ],
  },
  update: {
    gameList: [ [ 'gameIDs: number[]' ], '' ],
  },
  error: {},
};

const root = document.getElementById('root');

for (const headTitle in events) {
  const head = document.createElement('h2');
  head.innerText = headTitle;
  root.appendChild(head);
  const groupDiv = document.createElement('div');
  for (const eventName in events[headTitle]) {
    const eventData = events[headTitle][eventName];
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
    
    groupDiv.appendChild(eventHead);
    groupDiv.appendChild(eventText);
    const preWrapper = document.createElement('pre');
    preWrapper.appendChild(eventElement);
    groupDiv.appendChild(preWrapper);
  }
  root.appendChild(groupDiv);
}