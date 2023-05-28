document.querySelector('form').addEventListener('submit', async (event) => {
  event.preventDefault();
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
  console.log('Duplicates:', duplicates);
  const duplicatesTableBody = document.getElementById('duplicatesTableBody');
  console.log('Duplicates Table Body:', duplicatesTableBody);
  duplicatesTableBody.innerHTML = '';

  if (duplicates && duplicates.length > 0) {
    duplicates.forEach((duplicate) => {
      console.log('Processing Duplicate:', duplicate);
      const row = document.createElement('tr');
      const baseTitleCell = document.createElement('td');
      baseTitleCell.textContent = duplicate.title;
      row.appendChild(baseTitleCell);

      const artistCell = document.createElement('td');
      artistCell.textContent = duplicate.artist;
      row.appendChild(artistCell);

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
        versionItem.textContent = JSON.stringify(version, null, 2);
        versionsList.appendChild(versionItem);
      });
      versionsCell.appendChild(versionsList);
      row.appendChild(versionsCell);

      duplicatesTableBody.appendChild(row);
    });
  } else {
    console.log('No duplicates found');
  }
});
