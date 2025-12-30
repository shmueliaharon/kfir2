
fetch('itinerary.json')
  .then(r => r.json())
  .then(data => {
    const app = document.getElementById('app');
    data.days.forEach(day => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h2>${day.location}</h2><p>לינה: ${day.lodging}</p>`;
      day.places.forEach(p => {
        const div = document.createElement('div');
        div.className = 'place';
        div.innerHTML = `<h3>${p.name}</h3><p>${p.description}</p><a href="${p.website}" target="_blank">פתח במפות</a>`;
        card.appendChild(div);
      });
      app.appendChild(card);
    });
  });
