// Loading up the table when the user clicks the 'Find Duplicates' button
document.querySelector('form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = document.querySelector('input[type="submit"]');
  submitButton.disabled = true; // Disable the button during the loading process

  move(); // Call the move function to start the progress bar animation

  const username = document.getElementById('username').value;
  const method = document.getElementById('method').value;

  const response = await fetch('/duplicates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `username=${encodeURIComponent(username)}&method=${encodeURIComponent(method)}`,
  });

  const duplicates = await response.json();
  const duplicatesTableBody = document.getElementById('duplicatesTableBody');
  duplicatesTableBody.innerHTML = '';

  if (duplicates && duplicates.length > 0) {
    duplicates.forEach((duplicate, index) => {
      const row = document.createElement('tr');

      const artistCell = document.createElement('td');
      artistCell.textContent = duplicate.artist;
      row.appendChild(artistCell);

      const baseTitleCell = document.createElement('td');
      baseTitleCell.textContent = duplicate.title;
      row.appendChild(baseTitleCell);

      const totalPlaycountCell = document.createElement('td');
      totalPlaycountCell.textContent = duplicate['total-playcount'];
      row.appendChild(totalPlaycountCell);

      const versionCountCell = document.createElement('td');
      versionCountCell.textContent = duplicate.versions.length;
      row.appendChild(versionCountCell);

      const versionsCell = document.createElement('td');
      const versionsList = document.createElement('ul');
      duplicate.versions.forEach((version) => {
        const versionItem = document.createElement('li');
        const versionLink = document.createElement('a');
        versionLink.textContent = version.title;
        versionLink.href = version.url;
        versionLink.target = '_blank';
        versionItem.appendChild(versionLink);

        const playcountSpan = document.createElement('span');
        const playcountText = version.playcount === 1 ? 'scrobble' : 'scrobbles';
        playcountSpan.textContent = ` (${version.playcount} ${playcountText})`;
        versionItem.appendChild(playcountSpan);

        versionsList.appendChild(versionItem);
      });
      versionsCell.appendChild(versionsList);
      row.appendChild(versionsCell);

      duplicatesTableBody.appendChild(row);
    });
  } else {
    console.log('No duplicates found');
  }

  submitButton.disabled = false; // Enable the button after the loading process is complete
});

// The progress bar that shows how long the lastfm stats are taking to load from the API
function move() {
  const progressBar = document.querySelector('.movingProgress');
  const progressMessage = document.querySelector('.progressMessage');

  // Establish a connection to the Socket.IO server
  const socket = io();

  // Listen for the 'progress' event and update accordingly
  socket.on('progress', (progress) => {
    progressBar.style.width = `${progress}%`;
  });

  // Listen for the 'message' event and update accordingly
  socket.on('message', (message) => {
    progressMessage.textContent = message;
  });
}
